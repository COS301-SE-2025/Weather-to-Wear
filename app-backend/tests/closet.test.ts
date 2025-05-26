// import { Router } from 'express';
// import ClosetController from '../src/modules/closet';
// import * as ClosetService from '../src/closet.service';

// // Simple service existence tests
// describe('Closet Service', () => {
//   test('getAllClosetItems is defined', () => {
//     expect(typeof ClosetService.getAllClosetItems).toBe('function');
//   });

//   test('addItemToCloset is defined', () => {
//     expect(typeof ClosetService.addItemToCloset).toBe('function');
//   });
// });

// // Simple controller test
// describe('Closet Controller', () => {
//   it('should call service.addItemToCloset on create', async () => {
//     const req = { body: { name: 'Shirt', category: 'Top' } } as any;
//     const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
//     const newItem = { id: 1, name: 'Shirt', category: 'Top' };

//     jest.spyOn(ClosetService, 'addItemToCloset').mockResolvedValue(newItem);

//     await ClosetController.create(req, res);

//     expect(ClosetService.addItemToCloset).toHaveBeenCalledWith(req.body);
//     expect(res.status).toHaveBeenCalledWith(201);
//     expect(res.json).toHaveBeenCalledWith({ data: newItem });
//   });
// });

// // Simple route test
// describe('Closet Routes', () => {
//   test('closet router should be an Express router', () => {
//     const closetRouter = require('../src/closet.route').default;
//     expect(typeof closetRouter).toBe('function');
//     expect((closetRouter as Router).stack).toBeDefined();
//   });
// });
