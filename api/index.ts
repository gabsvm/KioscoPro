import express from 'express';
import { createElectronicInvoice } from '../services/afipService';

const app = express();
app.use(express.json());

// Main invoice generation endpoint
app.post('/api/generate-invoice', async (req, res) => {
  try {
    const { sale, profile } = req.body;

    if (!sale || !profile) {
      return res.status(400).json({ message: 'Missing sale or profile data in request body' });
    }

    const invoiceResult = await createElectronicInvoice(sale, profile);
    return res.status(200).json(invoiceResult);

  } catch (error: any) {
    console.error('API Error generating invoice:', error);
    const errorMessage = error.message || 'An unknown error occurred';
    return res.status(500).json({ message: 'Failed to generate electronic invoice', error: errorMessage });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server locally (Vercel uses the exported app directly)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server executing locally on http://localhost:${PORT}`);
  });
}

export default app;
