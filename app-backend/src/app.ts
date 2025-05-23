import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './modules/auth/auth.routes';
import clothingRoutes from './modules/clothing/clothing.routes';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// existing auth
app.use('/api/auth', authRoutes);
// new clothing endpoint
app.use('/api/clothing', clothingRoutes);

export default app;
