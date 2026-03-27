import express from 'express';
import cors from 'cors';
import 'express-async-errors';
import dotenv from 'dotenv';
import { initializeDatabase } from './src/models/database.js';
import { errorHandler } from './src/middleware/auth.js';

// Importar rutas
import authRoutes from './src/routes/authRoutes.js';
import favoritesRoutes from './src/routes/favoritesRoutes.js';
import teamsRoutes from './src/routes/teamsRoutes.js';
import friendRoutes from './src/routes/friendRoutes.js';
import pokemonRoutes from './src/routes/pokemonRoutes.js';
import notificationsRoutes from './src/routes/notificationsRoutes.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5432

// Middlewares
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'https://pokedex1-production.up.railway.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Inicializar base de datos
await initializeDatabase();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/pokemon', pokemonRoutes);
app.use('/api/notifications', notificationsRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor funcionando' });
});

// Manejo de errores
app.use(errorHandler);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✨ Servidor corriendo en http://localhost:${PORT}`);
});
