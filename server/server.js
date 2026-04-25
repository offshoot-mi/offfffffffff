import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
<<<<<<< HEAD
=======
import { existsSync } from 'fs';

>>>>>>> 7f9e807954ef71e86efc38309b0f65827a6ec1e4
import { notFound, errorHandler } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import contentRoutes from './routes/content.routes.js';
<<<<<<< HEAD
// Initialize data files
import './data/ensureDataFiles.js';
=======

// Optional: Initialize data files only if the module exists
try {
  await import('./data/ensureDataFiles.js');
  console.log('✅ Data files initializer loaded');
} catch (err) {
  if (err.code === 'ERR_MODULE_NOT_FOUND') {
    console.log('⚠️ Data initializer not found – skipping');
  } else {
    console.error('❌ Error loading data initializer:', err.message);
  }
}
>>>>>>> 7f9e807954ef71e86efc38309b0f65827a6ec1e4

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

<<<<<<< HEAD
app.use(cors());
app.use(express.json());

// Routes
=======
// ✅ CORS FIX (allow your domain + fallback safety)
app.use(cors({
  origin: [
    'https://www.draftiteration.com',
    'https://draftiteration.com'
  ],
  credentials: true,
}));

app.use(express.json());

// ------------------- API Routes -------------------
>>>>>>> 7f9e807954ef71e86efc38309b0f65827a6ec1e4
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);

<<<<<<< HEAD
// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../client/dist', 'index.html'));
  });
}
=======
// ------------------- Static Frontend -------------------
const staticPath = path.join(__dirname, '..', 'client', 'dist');

if (existsSync(staticPath)) {
  console.log(`✅ Serving frontend from: ${staticPath}`);

  app.use(express.static(staticPath));
>>>>>>> 7f9e807954ef71e86efc38309b0f65827a6ec1e4

  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
} else {
  console.log(`⚠️ Frontend build not found at ${staticPath}`);
  console.log('   → API routes are still available at /api/*');
}

// ------------------- Error Handling -------------------
app.use(notFound);
app.use(errorHandler);

<<<<<<< HEAD
const PORT = process.env.PORT || 5001
;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
=======
// ------------------- Start Server -------------------
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
>>>>>>> 7f9e807954ef71e86efc38309b0f65827a6ec1e4
