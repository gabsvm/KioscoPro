import { VercelRequest, VercelResponse } from '@vercel/node';
import { createElectronicInvoice } from '../../../services/afipService';
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

    const invoiceResult = await createElectronicInvoice(sale, profile);

    return res.status(200).json(invoiceResult);

  } catch (error: any) {
    console.error('API Error generating invoice:', error);
    // Send a more specific error message if available
    const errorMessage = error.message || 'An unknown error occurred';
    return res.status(500).json({ message: 'Failed to generate electronic invoice', error: errorMessage });
  }
}
