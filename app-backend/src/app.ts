import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
// for authentication
import authRoutes from './modules/auth/auth.routes';
// for weather API
import weatherRoutes from './modules/weather/weather.routes';

const app = express();

// Apply CORS middleware globally before defining any routes
app.use(cors());



dotenv.config();



app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);

export default app;
