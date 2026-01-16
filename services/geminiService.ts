import { GoogleGenAI } from "@google/genai";
import { Sale, Product, PaymentMethod } from '../types';

// Initialize Gemini Client
const getClient = () => {
  // Safe access to process.env to avoid browser crashes
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
  
  if (!apiKey) {
    console.warn("API Key not found. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeBusinessData = async (
  sales: Sale[],
  products: Product[],
  paymentMethods: PaymentMethod[]
): Promise<string> => {
  const client = getClient();
  if (!client) return "Error: API Key no configurada. Configura la variable de entorno API_KEY.";

  // Prepare a summary of the data to keep tokens low
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalProfit = sales.reduce((acc, s) => acc + s.totalProfit, 0);
  const productPerformance = products.map(p => {
    const sold = sales.reduce((acc, s) => {
        const item = s.items.find(i => i.productId === p.id);
        return acc + (item ? item.quantity : 0);
    }, 0);
    return `${p.name}: ${sold} units sold, Margin: ${(((p.sellingPrice - p.costPrice)/p.sellingPrice)*100).toFixed(1)}%`;
  }).join('\n');

  const methodsSummary = paymentMethods.map(m => `${m.name}: $${m.balance.toFixed(2)}`).join(', ');

  const prompt = `
    Actúa como un experto consultor de negocios para un Kiosco (tienda de conveniencia).
    Analiza los siguientes datos resumidos y dame 3 consejos clave breves y 1 observación importante para mejorar la rentabilidad.
    Usa formato Markdown. Sé directo y motivador.

    Datos Generales:
    - Ventas Totales: $${totalRevenue.toFixed(2)}
    - Ganancia Total: $${totalProfit.toFixed(2)}
    - Margen Global: ${totalRevenue > 0 ? ((totalProfit/totalRevenue)*100).toFixed(1) : 0}%

    Estado de Cajas:
    ${methodsSummary}

    Rendimiento de Productos:
    ${productPerformance}
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Updated to a currently available model for this SDK version if needed, or stick to flash
      contents: prompt,
    });
    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Error analyzing data:", error);
    return "Ocurrió un error al consultar a Gemini. Intenta más tarde.";
  }
};