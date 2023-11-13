const express = require('express');
const workoutsController = require('../controllers/workouts');

const router = express.Router();

router.get('/workouts', workoutsController.getWorkouts);
router.get('/workouts/new', workoutsController.newWorkoutView);
router.delete('/workouts/:id', workoutsController.deleteWorkout);
router.put('/workouts/:id', workoutsController.updateWorkout);
router.post('/workouts', workoutsController.createWorkout);
router.get('/workouts/:id/edit', workoutsController.editWorkoutView);
router.put('/workouts/:id/complete', workoutsController.toggleWorkoutCompletion);
router.get('/workouts/:id', workoutsController.showWorkout);


module.exports = router;
