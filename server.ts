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

async function createServer() {
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


  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from 'dist'
    const __dirname = path.resolve();
    app.use(express.static(path.join(__dirname, 'dist')));

    // For any other request, serve index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }


  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

createServer();
