import express from 'express';
import * as movementsController from '../controllers/movements';

const router = express.Router();

router.get('/movements', movementsController.getMovements);
router.get('/movements/new', movementsController.newMovementView);
router.delete('/movements/:id', movementsController.deleteMovement);
router.put('/movements/:id', movementsController.updateMovement);
router.post('/movements', movementsController.createMovement);
router.get('/movements/:id/edit', movementsController.editMovementView);


export default router;