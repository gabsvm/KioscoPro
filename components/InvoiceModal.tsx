import React from 'react';
import { Sale } from '../types';
import { X, Printer } from 'lucide-react';

interface InvoiceModalProps {
  sale: Sale;
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale, onClose }) => {
  const { invoice, items, totalAmount } = sale;

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl relative animate-in fade-in zoom-in-95 my-8">
        {/* Actions Bar (No print) */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 print:hidden">
          <h3 className="font-bold text-slate-700">Factura Generada</h3>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium"
            >
              <Printer size={18} /> Imprimir
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Content (Printable) */}
        <div id="invoice-content" className="p-8 bg-white text-xs md:text-sm font-mono md:font-sans">
          {/* Header */}
          <div className="border border-black relative mb-4">
            {/* Type Box */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-white border-b border-l border-r border-black w-12 h-12 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold leading-none">{invoice.type}</span>
              <span className="text-[8px] font-bold">COD. 0{invoice.type === 'A' ? '1' : invoice.type === 'B' ? '6' : '1'}</span>
            </div>

            <div className="grid grid-cols-2">
               {/* Left Header */}
               <div className="p-4 border-r border-black relative">
                 <h1 className="text-2xl font-bold mb-2">KIOSCO PRO</h1>
                 <p className="font-bold">Razón Social: Mi Kiosco S.A.</p>
                 <p>Domicilio Comercial: Av. Siempre Viva 123</p>
                 <p>Condición frente al IVA: Responsable Inscripto</p>
               </div>
               
               {/* Right Header */}
               <div className="p-4 pl-8">
                 <h2 className="text-xl font-bold mb-2">FACTURA</h2>
                 <p className="mb-1"><span className="font-bold">Punto de Venta:</span> 0001 <span className="font-bold">Comp. Nro:</span> {invoice.number}</p>
                 <p className="mb-1"><span className="font-bold">Fecha de Emisión:</span> {new Date(sale.timestamp).toLocaleDateString('es-AR')}</p>
                 <p className="mb-1"><span className="font-bold">CUIT:</span> 30-12345678-9</p>
                 <p className="mb-1"><span className="font-bold">Ingresos Brutos:</span> 123-456789</p>
                 <p><span className="font-bold">Fecha de Inicio de Actividades:</span> 01/01/2024</p>
               </div>
            </div>
          </div>

          {/* Client Info */}
          <div className="border border-black p-2 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <p><span className="font-bold">CUIT:</span> {invoice.clientCuit || 'Sin Datos'}</p>
              <p><span className="font-bold">Apellido y Nombre / Razón Social:</span> {invoice.clientName}</p>
              <p><span className="font-bold">Condición frente al IVA:</span> {invoice.conditionIva}</p>
              <p><span className="font-bold">Domicilio:</span> {invoice.clientAddress || '-'}</p>
              <p className="col-span-2"><span className="font-bold">Condición de venta:</span> {sale.paymentMethodName}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-4 border-collapse">
            <thead>
              <tr className="bg-slate-200 border border-black text-center">
                <th className="border border-black py-1">Cant.</th>
                <th className="border border-black py-1 text-left px-2">Descripción</th>
                <th className="border border-black py-1">Precio Unit.</th>
                <th className="border border-black py-1">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="text-center">
                  <td className="border-x border-black py-1">{item.quantity}</td>
                  <td className="border-x border-black py-1 text-left px-2">{item.productName}</td>
                  <td className="border-x border-black py-1">${item.unitPrice.toFixed(2)}</td>
                  <td className="border-x border-black py-1">${item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
              {/* Fill empty rows for layout */}
              {Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                   <td className="border-x border-black py-4">&nbsp;</td>
                   <td className="border-x border-black py-4">&nbsp;</td>
                   <td className="border-x border-black py-4">&nbsp;</td>
                   <td className="border-x border-black py-4">&nbsp;</td>
                </tr>
              ))}
              <tr className="border-t border-black"></tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-1/2 border border-black bg-slate-100 p-2">
              <div className="flex justify-between mb-1">
                <span className="font-bold">Subtotal:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="font-bold">Importe Otros Tributos:</span>
                <span>$0.00</span>
              </div>
               <div className="flex justify-between text-lg font-bold border-t border-black mt-2 pt-2">
                <span>Importe Total:</span>
                <span>${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer / CAE */}
          <div className="border border-black p-4 flex justify-between items-center bg-slate-50">
             <div className="w-2/3">
               <p className="italic text-[10px] text-slate-500">
                 Comprobante Autorizado. Esta es una representación gráfica simulada de la factura electrónica.
               </p>
             </div>
             <div className="w-1/3 text-right">
               <p className="font-bold">CAE: {invoice.cae}</p>
               <p className="font-bold">Vto. CAE: {invoice.caeVto}</p>
             </div>
          </div>
        </div>
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceModal;