import { VercelRequest, VercelResponse } from '@vercel/node';
import { createElectronicInvoice } from '../../services/afipService';
import { Sale, StoreProfile } from '../../types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { sale, profile } = req.body as { sale: Sale; profile: StoreProfile };

    if (!sale || !profile) {
      return res.status(400).json({ message: 'Missing sale or profile data in request body' });
    }

    const certContent = process.env.AFIP_CERT;
    const keyContent = process.env.AFIP_KEY;

    if (!certContent || !keyContent) {
        return res.status(500).json({ message: 'AFIP certificate or key not configured in environment variables' });
    }

    const invoiceResult = await createElectronicInvoice(sale, profile, certContent, keyContent);

    return res.status(200).json(invoiceResult);

  } catch (error: any) {
    console.error('API Error generating invoice:', error);
    const errorMessage = error.message || 'An unknown error occurred';
    return res.status(500).json({ message: 'Failed to generate electronic invoice', error: errorMessage });
  }
}
