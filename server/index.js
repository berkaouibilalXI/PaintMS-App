const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV === 'development';

// CORS configuration for both dev and production
const corsOptions = {
  origin: [
    'http://localhost:5173',  // Vite dev server
    'tauri://localhost',      // Tauri production
    'https://tauri.localhost',
    'tauri://localhost',      // Alternative Tauri production
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
};

//Middlewares globaux
app.use(cors(corsOptions));
app.use(express.json());

//importer les middlewarew tw3na
const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');
const auth = require('./middlewares/authMiddleware');

//importer les routes tw3na
const invoiceRoutes = require('./routes/invoiceRoutes');
const clientRoutes = require('./routes/clientRoutes');
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/authRoutes');

//nkhdmou b logger en mode dev
if (isDevelopment) {
  app.use(requestLogger);
}

// <=========ROUTES==================>
// utilisation te3 les routes avec protection mn 3nd auth middleware
app.use('/api/v1/invoices', auth, invoiceRoutes);
app.use('/api/v1/clients', auth, clientRoutes);
app.use('/api/v1/products', auth, productRoutes);
app.use('/api/v1/auth', authRoutes);

// route check health
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'TOUT EST PARFAIT', message: 'MRHBAAA BIIIIIKK' });
});

app.get('/', async (req, res) => {
  res.status(200).send("Working Fine Sahbbi");
});

//gestion des erreurs
app.use(errorHandler);

//demarrage du serveur
app.listen(PORT, () => {
  console.log(`Backend Express lancé sur http://localhost:${PORT}`);
  console.log(`Mode: ${isDevelopment ? 'Development' : 'Production'}`);
});

function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log("Backend lancé");
      resolve({ server, port });
    });
  });
}

module.exports = { app, startServer };