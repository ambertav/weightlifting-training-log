const express = require('express');
const movementsController = require('../controllers/movements');

const router = express.Router();

router.get('/movements', movementsController.getMovements);
router.get('/movements/new', movementsController.newMovementView);
router.delete('/movements/:id', movementsController.deleteMovement);
router.put('/movements/:id', movementsController.updateMovement);
router.post('/movements', movementsController.createMovement);
router.get('/movements/:id/edit', movementsController.editMovementView);


module.exports = router;