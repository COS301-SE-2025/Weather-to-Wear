import { Router } from 'express';
import { getWeather, getWeatherForDay, getWeatherForWeek, getCityMatches } from './weather.controller';

const router = Router();

router.get('/', getWeather); 
router.get('/day', getWeatherForDay);
router.get('/week', getWeatherForWeek); 
router.get('/search-cities', getCityMatches);

export default router;
