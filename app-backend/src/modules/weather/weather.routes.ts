import { Router } from 'express';
import { getWeather, getWeatherForDay, getWeatherForWeek, getCityMatches } from './weather.controller';

const router = Router();

router.get('/', getWeather); 
router.get('/day', getWeatherForDay);
router.get('/week', getWeatherForWeek); // NEW (7-day planner)
router.get('/search-cities', getCityMatches); // NEW (city disambiguation)

export default router;
