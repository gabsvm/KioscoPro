
import React, { useState } from 'react';
import { Sale, StoreProfile } from '../types';
import { X, Printer, Download, Share2, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import { formatCurrency } from '../utils';

interface InvoiceModalProps {
  sale: Sale;
  storeProfile: StoreProfile;
  onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale, storeProfile, onClose }) => {
  const { invoice, items, totalAmount } = sale;
  const [isDownloading, setIsDownloading] = useState(false);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    const element = document.getElementById('invoice-content');
    if (element) {
      try {
        const canvas = await html2canvas(element, {
            scale: 2, // Higher resolution
            backgroundColor: '#ffffff'
        });
        const data = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = data;
        link.download = `Factura-${invoice.type}-${invoice.number}.png`;
        link.click();
      } catch (error) {
        console.error("Error generating image", error);
        alert("No se pudo generar la imagen");
      }
    }
    setIsDownloading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="flex flex-col w-full max-w-[480px] my-4 animate-in fade-in zoom-in-95">
        
        {/* Main Card */}
        <div className="bg-white shadow-2xl relative rounded-lg overflow-hidden">
            
          {/* Actions Bar (No print) */}
          <div className="flex justify-between items-center p-4 border-b border-slate-200 print:hidden bg-slate-50">
            <h3 className="font-bold text-slate-700">Comprobante</h3>
            <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Invoice Content (Printable & Capture) - Estilo AFIP Factura C */}
          <div id="invoice-content" className="bg-white p-8 text-black font-sans leading-tight">
            
            {/* Header Emisor */}
            <div className="text-center mb-5">
              <h1 className="text-2xl font-bold uppercase tracking-tight">{storeProfile.name}</h1>
              <div className="text-sm font-bold mt-1 text-slate-800">de {storeProfile.owner}</div>
              <div className="text-sm mt-1">{storeProfile.address}</div>
              <div className="text-sm uppercase">{storeProfile.city}</div>
              <div className="text-sm mt-1">CUIT: {storeProfile.cuit}</div>
              <div className="text-sm">Ing. Brutos: {storeProfile.iibb}</div>
              <div className="text-sm">Inicio Act: {storeProfile.startDate}</div>
              <div className="text-sm">Condición IVA: {storeProfile.ivaCondition}</div>
            </div>

            <div className="border-b-2 border-black my-3"></div>

            {/* Tipo de Factura y Numero */}
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">FACTURA (cod.011) "C"</h2>
              </div>
              <div className="text-right mt-1">
                 <div className="text-sm font-medium">Nro: {invoice.number}</div>
                 <div className="text-sm">Fecha: {new Date(sale.timestamp).toLocaleDateString('es-AR')}</div>
              </div>
            </div>

            <div className="border-b-2 border-black my-3"></div>

            {/* Datos del Cliente */}
            <div className="mb-4 text-sm">
              <div className="mb-1 grid grid-cols-[80px_1fr]"><span className="font-bold">Cliente:</span> <span className="uppercase">{invoice.clientName}</span></div>
              <div className="mb-1 grid grid-cols-[80px_1fr]"><span className="font-bold">CUIT:</span> <span>{invoice.clientCuit || '0'}</span></div>
              <div className="mb-1 grid grid-cols-[80px_1fr]"><span className="font-bold">Cond.IVA:</span> <span>{invoice.conditionIva === 'Consumidor Final' ? 'Final' : invoice.conditionIva}</span></div>
              <div className="mb-1 grid grid-cols-[80px_1fr]"><span className="font-bold">Domicilio:</span> <span className="uppercase">{invoice.clientAddress || 'MOSTRADOR'}</span></div>
            </div>

            <div className="border-b-2 border-black my-3"></div>

            {/* Tabla de Items */}
            <div className="mb-4 min-h-[100px]">
              {/* Headers */}
              <div className="flex text-xs font-bold mb-2 border-b border-black pb-1 uppercase">
                <div className="w-[15%]">Cant.</div>
                <div className="w-[50%]">Descripción</div>
                <div className="w-[35%] text-right">Subtotal</div>
              </div>

              {/* Rows */}
              <div className="text-sm space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-start">
                    <div className="w-[15%] pt-0.5">{item.quantity}</div>
                    <div className="w-[50%] font-medium leading-snug">
                        {item.productName}
                        <div className="text-[10px] text-slate-500 font-normal">x {formatCurrency(item.unitPrice)}</div>
                    </div>
                    <div className="w-[35%] text-right font-bold">{formatCurrency(item.subtotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-black mt-4 pt-2"></div>

            {/* Total */}
            <div className="flex justify-between items-end mt-2 mb-4">
               <div className="text-lg font-bold">Importe Total:</div>
               <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            </div>

            {/* Pagos */}
            <div className="mb-6 text-xs text-slate-600">
              <div className="font-bold mb-1 border-b border-slate-300 pb-1">FORMA DE PAGO:</div>
              {sale.payments && sale.payments.length > 0 ? (
                sale.payments.map((p, i) => (
                   <div key={i} className="flex justify-between">
                     <span className="uppercase">{p.methodName}</span>
                     <span>{formatCurrency(p.amount)}</span>
                   </div>
                ))
              ) : (
                <div className="flex justify-between">
                   <span className="uppercase">{sale.paymentMethodName}</span>
                   <span>{formatCurrency(totalAmount)}</span>
                </div>
              )}
            </div>

            {/* Footer QR y CAE */}
            <div className="flex gap-3 items-center pt-4 border-t border-dashed border-slate-400">
               {/* Fake QR */}
               <div className="w-20 h-20 bg-white border border-slate-200 p-1 shrink-0">
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify({ver:1,fecha:new Date().toISOString(),cuit:storeProfile.cuit,ptoVta:1,tipoCmp:11,nroCmp:invoice.number,importe:totalAmount,moneda:"PES",ctz:1,tipoDocRec:99,nroDocRec:0,tipoCodAut:"E",codAut:invoice.cae}))}`} 
                   alt="QR AFIP" 
                   className="w-full h-full object-contain"
                 />
               </div>
               
               <div className="flex-1 flex flex-col justify-between h-20">
                 <div className="text-right text-[10px]">
                   <div className="font-bold">CAE Nro: {invoice.cae}</div>
                   <div>Fecha Vto CAE: {invoice.caeVto}</div>
                 </div>
                 
                 {/* Logo AFIP Simulado CSS */}
                 <div className="self-end mt-auto">
                   <div className="flex items-end gap-0.5 opacity-60">
                      <div className="w-1.5 h-4 bg-slate-500 skew-x-[-10deg] rounded-[1px]"></div>
                      <div className="w-1.5 h-4 bg-slate-500 skew-x-[-10deg] rounded-[1px]"></div>
                      <div className="w-1.5 h-4 bg-slate-500 skew-x-[-10deg] rounded-[1px]"></div>
                      <span className="font-black text-slate-600 text-lg ml-1 leading-none italic">AFIP</span>
                   </div>
                   <div className="text-[8px] text-right mt-0.5 font-bold text-slate-500 uppercase">Comprobante Autorizado</div>
                 </div>
               </div>
            </div>
            
            <div className="text-center mt-6 text-[9px] text-slate-400 uppercase tracking-widest">
              Original: Cliente
            </div>

          </div>

          {/* Action Buttons Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-200 grid grid-cols-2 gap-3 print:hidden">
             <button 
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 font-bold shadow-sm"
              >
                <Printer size={20} /> Imprimir
              </button>
              
              <button 
                onClick={handleDownloadImage}
                disabled={isDownloading}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 disabled:opacity-70"
              >
                {isDownloading ? (
                    <span className="animate-pulse">Generando...</span>
                ) : (
                    <><Download size={20} /> Guardar Imagen</>
                )}
              </button>
          </div>
        </div>

        {/* Big Close Button Outside */}
        <button 
          onClick={onClose}
          className="mt-4 w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-900 shadow-xl transition-transform active:scale-95 flex items-center justify-center gap-2 print:hidden"
        >
          <Check size={24} /> Finalizar y Cerrar
        </button>

      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
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
            max-width: 100%;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            border: none;
            background: white !important;
          }
          /* Ensure backgrounds print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceModal;
