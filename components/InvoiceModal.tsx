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

  // Simulación de datos del emisor (Tu Kiosco)
  const sellerInfo = {
    name: "KIOSCO PRO MANAGER",
    owner: "GABRIEL S. VENDEDOR",
    address: "Av. Corrientes 1234",
    city: "CABA",
    cuit: "20-12345678-9",
    iibb: "20-12345678-9",
    startDate: "01/03/2023",
    ivaCondition: "Monotributo"
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white shadow-2xl w-full max-w-[480px] relative animate-in fade-in zoom-in-95 my-8">
        {/* Actions Bar (No print) */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 print:hidden bg-slate-50 rounded-t-lg">
          <h3 className="font-bold text-slate-700">Vista Previa</h3>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium text-sm"
            >
              <Printer size={16} /> Imprimir
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Invoice Content (Printable) - Estilo AFIP Factura C */}
        <div id="invoice-content" className="bg-white p-6 text-black font-sans leading-tight">
          
          {/* Header Emisor */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold uppercase">{sellerInfo.name}</h1>
            <div className="text-sm font-bold mt-1">de {sellerInfo.owner}</div>
            <div className="text-sm mt-1">{sellerInfo.address}</div>
            <div className="text-sm uppercase">{sellerInfo.city}</div>
            <div className="text-sm mt-1">CUIT Nro: {sellerInfo.cuit}</div>
            <div className="text-sm">Ing. Brutos: {sellerInfo.iibb}</div>
            <div className="text-sm">Inicio Actividades: {sellerInfo.startDate}</div>
            <div className="text-sm">Condición IVA: {sellerInfo.ivaCondition}</div>
          </div>

          <div className="border-b-2 border-black my-2"></div>

          {/* Tipo de Factura y Numero */}
          <div className="mb-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">FACTURA (cod.011) "C"</h2>
            </div>
            <div className="text-right mt-1">
               <div className="text-sm font-medium">fac-{invoice.type}-0001-{invoice.number}</div>
               <div className="text-sm">Fecha: {new Date(sale.timestamp).toLocaleDateString('es-AR')}</div>
            </div>
          </div>

          <div className="border-b-2 border-black my-2"></div>

          {/* Datos del Cliente */}
          <div className="mb-4 text-sm">
            <div className="mb-1"><span className="capitalize">{invoice.clientName}</span></div>
            <div className="mb-1">CUIT Nro: {invoice.clientCuit || '0'}</div>
            <div className="mb-1">Cond.IVA: {invoice.conditionIva === 'Consumidor Final' ? 'Final' : invoice.conditionIva}</div>
            <div className="mt-2 uppercase">{invoice.clientAddress || 'MOSTRADOR'}</div>
          </div>

          <div className="border-b-2 border-black my-2"></div>

          {/* Tabla de Items */}
          <div className="mb-4">
            {/* Headers */}
            <div className="flex text-sm font-medium mb-2 border-b border-black pb-1">
              <div className="w-[45%]">Cant.x P.Unitario<br/>Descripción</div>
              <div className="w-[20%] text-right">Tasa Iva</div>
              <div className="w-[35%] text-right">Subtotal</div>
            </div>

            {/* Rows */}
            <div className="text-sm space-y-3">
              {items.map((item, idx) => (
                <div key={idx}>
                  <div className="mb-0.5">{item.quantity.toFixed(2)} x {item.unitPrice.toFixed(2)}</div>
                  <div className="flex justify-between items-start">
                    <div className="w-[45%] font-medium">{item.productName}</div>
                    <div className="w-[20%] text-right text-slate-500">(0.00)</div>
                    <div className="w-[35%] text-right font-medium">{item.subtotal.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-between items-end mt-6 mb-4">
             <div className="text-lg font-bold">Importe Total:$</div>
             <div className="text-xl font-bold">{totalAmount.toFixed(2)}</div>
          </div>

          {/* Pagos */}
          <div className="mb-6 text-sm">
            <div className="font-bold mb-1">Pagos</div>
            <div className="flex justify-between">
              <span>{sale.paymentMethodName}</span>
              <span>$ {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer QR y CAE */}
          <div className="flex gap-4 items-center pt-4 border-t border-dashed border-slate-300">
             {/* Fake QR */}
             <div className="w-24 h-24 bg-white border border-slate-200 p-1 shrink-0">
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://www.afip.gob.ar/fe/qr/?p=${btoa(JSON.stringify({ver:1,fecha:new Date().toISOString(),cuit:sellerInfo.cuit,ptoVta:1,tipoCmp:11,nroCmp:invoice.number,importe:totalAmount,moneda:"PES",ctz:1,tipoDocRec:99,nroDocRec:0,tipoCodAut:"E",codAut:invoice.cae}))}`} 
                 alt="QR AFIP" 
                 className="w-full h-full object-contain opacity-90"
               />
             </div>
             
             <div className="flex-1 flex flex-col justify-between h-24">
               <div className="text-right text-xs">
                 <div className="font-bold">CAE Nro: {invoice.cae}</div>
                 <div>Fecha Vto CAE: {invoice.caeVto}</div>
               </div>
               
               {/* Logo AFIP Simulado CSS */}
               <div className="self-end mt-auto">
                 <div className="flex items-end gap-0.5 opacity-60">
                    <div className="w-2 h-6 bg-slate-400 skew-x-[-10deg] rounded-sm"></div>
                    <div className="w-2 h-6 bg-slate-400 skew-x-[-10deg] rounded-sm"></div>
                    <div className="w-2 h-6 bg-slate-400 skew-x-[-10deg] rounded-sm"></div>
                    <span className="font-black text-slate-600 text-xl ml-1 leading-none italic">AFIP</span>
                 </div>
                 <div className="text-[9px] text-right mt-1 font-medium text-slate-500">Comprobante Autorizado</div>
               </div>
             </div>
          </div>
          
          <div className="text-center mt-6 text-[10px] text-slate-400">
            Facturalo Simple by KioscoPro
          </div>

        </div>
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