import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import admin from 'firebase-admin';
import { StoreProfile } from './types'; // Import types

// Initialize Firebase Admin SDK
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Backend API calls to Firebase will fail.');
} else {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (e) {
    console.error('Error initializing Firebase Admin SDK:', e);
  }
}

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: admin.auth.DecodedIdToken;
}

// Middleware to verify Firebase ID token
const verifyFirebaseToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized: No token provided.');
  }
  const idToken = authHeader.split('Bearer ')[1];
  try {
    req.user = await admin.auth().verifyIdToken(idToken);
    next();
  } catch (error) {
    return res.status(403).send('Unauthorized: Invalid token.');
  }
};

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// AFIP integration endpoint with authentication
app.post('/api/afip/generate-invoice', verifyFirebaseToken, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.uid;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID not found in token.' });
  }

  try {
    const configDoc = await admin.firestore().collection('users').doc(userId).collection('settings').doc('config').get();
    if (!configDoc.exists) {
      return res.status(404).json({ success: false, message: 'Configuración de la tienda no encontrada.' });
    }

    const storeProfile = configDoc.data() as StoreProfile;
    const afipConfig = storeProfile.afipConfig;

    if (!afipConfig || !afipConfig.cuit || !afipConfig.cert || !afipConfig.privateKey) {
      return res.status(400).json({ success: false, message: 'Credenciales de AFIP no configuradas en el perfil.' });
    }

    const { saleData } = req.body;
    console.log(`Generating AFIP invoice for user ${userId} with CUIT ${afipConfig.cuit} in ${afipConfig.environment} mode.`);
    // TODO: Implement actual AFIP library logic here using afipConfig
    
    // This is a placeholder response.
    res.status(200).json({ success: true, message: 'Factura generándose.', invoiceId: `AFIP-${userId.slice(0,4)}-${Date.now().toString().slice(-4)}` });

  } catch (error) {
    console.error('Error in AFIP invoice generation:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
});

// This is the Vercel entrypoint. Triggering a new check.
export default app;
