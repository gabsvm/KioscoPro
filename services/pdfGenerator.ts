import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, StoreProfile } from '../types';
import { formatCurrency } from '../utils';

export const generateSalesReportPDF = (
  sales: Sale[],
  dateRange: { start: string, end: string },
  storeProfile: StoreProfile
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header - Store Info
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text(storeProfile.name.toUpperCase(), 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${storeProfile.owner} | CUIT: ${storeProfile.cuit}`, 14, 28);
  doc.text(`${storeProfile.address}, ${storeProfile.city}`, 14, 33);
  doc.text(`Condición IVA: ${storeProfile.ivaCondition} | IIBB: ${storeProfile.iibb}`, 14, 38);

  // Report Title
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('LISTADO DE VENTAS PARA CONTABILIDAD', 14, 50);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Período: ${dateRange.start} al ${dateRange.end}`, 14, 56);
  doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 61);

  // Summary Box
  const totalRevenue = sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const totalTransactions = sales.length;
  
  doc.setDrawColor(200);
  doc.setFillColor(245, 247, 250);
  doc.rect(14, 68, pageWidth - 28, 15, 'F');
  
  doc.setFontSize(11);
  doc.setTextColor(40);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL VENDIDO: ${formatCurrency(totalRevenue)}`, 20, 77);
  doc.text(`TRANSACCIONES: ${totalTransactions}`, pageWidth - 70, 77);
  doc.setFont('helvetica', 'normal');

  // Table Data
  const tableData = sales.map(sale => {
    const date = new Date(sale.timestamp).toLocaleDateString();
    const time = new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Format payments
    let paymentInfo = sale.paymentMethodName;
    if (sale.payments && sale.payments.length > 1) {
      paymentInfo = sale.payments.map(p => `${p.methodName}`).join(', ');
    }

    // Invoice info
    const invoiceInfo = sale.invoice ? `${sale.invoice.type} ${sale.invoice.number}` : 'Ticket Interno';

    return [
      `${date} ${time}`,
      sale.id.slice(-6).toUpperCase(),
      invoiceInfo,
      paymentInfo,
      formatCurrency(sale.totalAmount)
    ];
  });

  autoTable(doc, {
    startY: 90,
    head: [['Fecha/Hora', 'ID', 'Comprobante', 'Método Pago', 'Total']],
    body: tableData,
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { top: 90 },
    didDrawPage: (data) => {
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150);
      const str = `Página ${doc.internal.getNumberOfPages()}`;
      doc.text(str, pageWidth - 25, doc.internal.pageSize.getHeight() - 10);
      doc.text('Generado por KioscoPro Manager', 14, doc.internal.pageSize.getHeight() - 10);
    }
  });

  doc.save(`KioscoPro_Listado_Ventas_${dateRange.start}_al_${dateRange.end}.pdf`);
};
