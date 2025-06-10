import {Router} from 'express';
import path from 'path'; 
import eventsController from './events.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();


router.get('/', 
    authenticateToken,
    eventsController.getEvents
);

router.get(
    '/:id', 
    authenticateToken,
    eventsController.getEventById
);

router.post(
    '/', 
    authenticateToken,
    eventsController.addEvent
);

router.put(
    '/:id', 
    authenticateToken,
    eventsController.updateEvent
);

router.delete(
    '/:id', 
    authenticateToken,
    eventsController.deleteEvent
);

export default router;