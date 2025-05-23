import { Router } from 'express';
import { getWeather } from './weather.controller';

const router = Router();

router.get('/', getWeather); 

export default router;
