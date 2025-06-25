import { Router } from 'express';
import { getWeather, getWeatherForDay } from './weather.controller';

const router = Router();

router.get('/', getWeather); 
router.get('/day', getWeatherForDay);

export default router;