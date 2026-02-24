import Afip from '@afipsdk/afip.js';
import { StoreProfile, Sale } from '../types';
import fs from 'fs/promises';
import path from 'path';

// Define a type for the electronic invoice data structure expected by AFIP
interface AfipInvoiceData {
  // Define the properties based on what the AFIP SDK requires
  // This is a simplified example. You'll need to consult the SDK docs for the full structure.
  CantReg: number;
  PtoVta: number;
  CbteTipo: number;
  Concepto: number;
  DocTipo: number;
  DocNro: number;
  CbteDesde: number;
  CbteHasta: number;
  CbteFch: string;
  ImpTotal: number;
  ImpTotConc: number;
  ImpNeto: number;
  ImpOpEx: number;
  ImpIVA: number;
  ImpTrib: number;
  MonId: string;
  MonCotiz: number;
  // Add other fields like Alicuotas, Tributos, etc. as needed
}

let afip: Afip | null = null;

async function getAfipInstance(profile: StoreProfile): Promise<Afip> {
  if (afip) {
    return afip;
  }

  if (!profile.afipConfig || !profile.posNumber) {
    throw new Error('AFIP configuration is incomplete in store profile.');
  }

  // In a real app, you might need to write these to temp files if the SDK requires file paths
  // For this example, we'll assume the SDK can take content directly if possible,
  // or we'll proceed with writing them.

  // The SDK likely requires file paths, so let's write them to a temporary location.
  // Note: In a serverless or containerized environment, the /tmp directory is often writable.
  const certPath = path.join('/tmp', 'afip.crt');
  const keyPath = path.join('/tmp', 'afip.key');

  await fs.writeFile(certPath, profile.afipConfig.cert);
  await fs.writeFile(keyPath, profile.afipConfig.privateKey);

  const afipInstance = new Afip({
    CUIT: profile.afipConfig.cuit,
    cert: certPath,
    key: keyPath,
    production: profile.afipConfig.environment === 'production',
    // It's good practice to handle potential missing posNumber, though we check above.
    res_folder: path.join(process.cwd(), 'afip_res'), // Folder to store AFIP responses
    ta_folder: path.join(process.cwd(), 'afip_ta'), // Folder to store AFIP tokens
  });

  afip = afipInstance;
  return afip;
}

export async function createElectronicInvoice(sale: Sale, profile: StoreProfile): Promise<any> {
  try {
    const afip = await getAfipInstance(profile);

    // 1. Get Last Voucher Number to determine the next one
    const lastVoucher = await afip.ElectronicBilling.getLastVoucher({
        PtoVta: profile.posNumber!,
        CbteTipo: 6, // Factura B
    });

    const nextVoucherNumber = lastVoucher + 1;

    // 2. Prepare the invoice data
    // This is a highly simplified mapping. A real implementation needs to handle
    // different invoice types (A, B, C), document types, IVA calculations, etc.
    const invoiceData: AfipInvoiceData = {
      CantReg: 1, // Creating one invoice
      PtoVta: profile.posNumber!,
      CbteTipo: 6, // 6 = Factura B
      Concepto: 1, // 1 = Productos
      DocTipo: 99, // 99 = Consumidor Final
      DocNro: 0, // 0 for Consumidor Final
      CbteDesde: nextVoucherNumber,
      CbteHasta: nextVoucherNumber,
      CbteFch: new Date().toISOString().slice(0, 10).replace(/-/g, ''), // YYYYMMDD format
      ImpTotal: sale.totalAmount,
      ImpTotConc: 0, // Net non-taxable
      ImpNeto: sale.totalAmount / 1.21, // Assuming 21% IVA
      ImpOpEx: 0, // Exempt operations
      ImpIVA: sale.totalAmount - (sale.totalAmount / 1.21),
      ImpTrib: 0, // Other tributes
      MonId: 'PES', // Currency: Argentine Peso
      MonCotiz: 1, // Exchange rate
    };

    // 3. Create the invoice
    const result = await afip.ElectronicBilling.createVoucher(invoiceData);

    console.log('Invoice created successfully:', result);

    // The result contains the CAE and VencimientoCAE
    return {
      cae: result.CAE,
      caeDueDate: result.CAEFchVto,
      voucherNumber: nextVoucherNumber,
    };

  } catch (error) {
    console.error('Error creating AFIP invoice:', error);
    // Rethrow or handle the error as needed
    throw error;
  }
}
