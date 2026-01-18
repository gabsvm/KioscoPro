import { Sale, Product, PaymentMethod } from '../types';
import { GoogleGenAI } from "@google/genai";

export const analyzeBusinessData = async (
  sales: Sale[],
  products: Product[],
  paymentMethods: PaymentMethod[]
): Promise<string> => {
  try {
    // Use process.env.API_KEY directly as per @google/genai guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Prepare a summary of the data
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalProfit = sales.reduce((acc, s) => acc + s.totalProfit, 0);
    const productPerformance = products.slice(0, 20).map(p => { 
      const sold = sales.reduce((acc, s) => {
          const item = s.items.find(i => i.productId === p.id);
          return acc + (item ? item.quantity : 0);
      }, 0);
      return `${p.name}: ${sold} units sold`;
    }).join('\n');

    const methodsSummary = paymentMethods.map(m => `${m.name}: $${m.balance.toFixed(2)}`).join(', ');

    const prompt = `
      Analiza los siguientes datos resumidos:

      Ventas: $${totalRevenue.toFixed(2)}
      Ganancia: $${totalProfit.toFixed(2)}
      Margen: ${totalRevenue > 0 ? ((totalProfit/totalRevenue)*100).toFixed(1) : 0}%

      Cajas:
      ${methodsSummary}

      Top Productos:
      ${productPerformance}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Actúa como un experto consultor de negocios para un Kiosco. Dame 3 consejos breves y 1 observación clave basados en los datos. Usa Markdown.",
      },
    });
    
    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Error analyzing data:", error);
    return "Ocurrió un error al conectar con el servicio de IA. Intenta más tarde.";
  }
};
