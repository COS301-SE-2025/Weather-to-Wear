import { Request, Response, NextFunction } from 'express';

class eventsController{

    //GET 
    // => /api/events
    getEvents = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Simulate fetching events from a database or service
            const events = [
                { id: 1, name: 'Event 1', date: '2023-10-01' },
                { id: 2, name: 'Event 2', date: '2023-10-02' }
            ];
            res.status(200).json(events);
        } catch (err) {
            next(err);
        }
    }

    //POST
    // => /api/events
    createEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const newEvent = req.body; // Assuming the event data is in the request body
            // Simulate saving the event to a database or service
            newEvent.id = Math.floor(Math.random() * 1000); // Mock ID generation
            res.status(201).json(newEvent);
        } catch (err) {
            next(err);
        }
    }

    //POST 
    // => /api/events/:id
    addEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const eventId = parseInt(req.params.id);
            const addEvent = req.body; // Assuming the updated event data is in the request body
            // Simulate updating the event in a database or service
            addEvent.id = eventId; // Mock ID assignment
            res.status(200).json(addEvent);
        } catch (err) {
            next(err);
        }
    }

    //POST 
    // => /api/events/:id
    updateEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const eventId = parseInt(req.params.id);
            const updatedEvent = req.body; // Assuming the updated event data is in the request body
            // Simulate updating the event in a database or service
            updatedEvent.id = eventId; // Mock ID assignment
            res.status(200).json(updatedEvent);
        } catch (err) {
            next(err);
        }
    }

    //DELETE
    // => /api/events/:id
    deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const eventId = parseInt(req.params.id);
            // Simulate deleting the event from a database or service
            res.status(204).send(); // No content to return
        } catch (err) {
            next(err);
        }
    }

    //GET
    // => /api/events/:id
    getEventById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const eventId = parseInt(req.params.id);
            // Simulate fetching the event from a database or service
            const event = { id: eventId, name: `Event ${eventId}`, date: '2023-10-01' };
            res.status(200).json(event);
        } catch (err) {
            next(err);
        }
    }



}

export default new eventsController();
