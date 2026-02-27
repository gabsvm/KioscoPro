import Afip from '@afipsdk/afip.js';
import { StoreProfile, Sale } from '../types';
import fs from 'fs/promises';
import path from 'path';

interface AfipInvoiceData {
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
}

let afip: Afip | null = null;

async function getAfipInstance(profile: StoreProfile): Promise<Afip> {
  if (afip) {
    return afip;
  }

  if (!profile.cuit || !profile.posNumber || !profile.afipConfig) {
    throw new Error('AFIP configuration (CUIT, POS number, environment) is incomplete in the store profile.');
  }

  const certPath = path.resolve(process.cwd(), 'certificate.pem');
  const keyPath = path.resolve(process.cwd(), 'private_key.pem');

  const certContent = await fs.readFile(certPath, 'utf-8');
  const keyContent = await fs.readFile(keyPath, 'utf-8');

  const afipInstance = new Afip({
    CUIT: profile.cuit,
    cert: certContent,
    key: keyContent,
    production: profile.afipConfig.environment === 'production',
  });

  afip = afipInstance;
  return afip;
}

export async function createElectronicInvoice(sale: Sale, profile: StoreProfile): Promise<any> {
  try {
    const afip = await getAfipInstance(profile);

    const lastVoucher = await afip.ElectronicBilling.getLastVoucher({
        PtoVta: profile.posNumber!,
        CbteTipo: 6, // Factura B
    });

    const nextVoucherNumber = lastVoucher + 1;

    const invoiceData: AfipInvoiceData = {
      CantReg: 1,
      PtoVta: profile.posNumber!,
      CbteTipo: 6, 
      Concepto: 1, 
      DocTipo: 99, 
      DocNro: 0, 
      CbteDesde: nextVoucherNumber,
      CbteHasta: nextVoucherNumber,
      CbteFch: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      ImpTotal: sale.totalAmount,
      ImpTotConc: 0,
      ImpNeto: sale.totalAmount / 1.21,
      ImpOpEx: 0,
      ImpIVA: sale.totalAmount - (sale.totalAmount / 1.21),
      ImpTrib: 0,
      MonId: 'PES',
      MonCotiz: 1,
    };

    const result = await afip.ElectronicBilling.createVoucher(invoiceData);

    console.log('Invoice created successfully:', result);

    return {
      success: true,
      cae: result.CAE,
      caeDueDate: result.CAEFchVto,
      voucherNumber: nextVoucherNumber,
      invoiceId: result.voucher_number, 
    };

  } catch (error: any) {
    console.error('Error creating AFIP invoice:', error);
    throw new Error(error.message || 'Unknown error from afipService');
  }
}
