const express = require('express');
const router = express.Router();
const Workout = require('../models/workout');
const Movement = require('../models/movement');
const { route } = require('./movements');

// index
router.get('/workouts', function (req, res) {
    Workout.find({}, function (error, allWorkouts) {
        res.render('workout-index.ejs', {
            workouts: allWorkouts
        });
    });
});

// new
router.get('/workouts/new', function (req, res) {
    Movement.find({}, function (error, allMovements) {
        res.render('workout-new.ejs', {
            movements: allMovements
        });
    });
});

// delete
router.delete('/workouts/:id', function (req, res) {
    Workout.findByIdAndDelete(req.params.id, function (error, deletedWorkout) {
        res.redirect('/workouts');
    });
});

// create
router.post('/workouts', function (req, res) {
    const exercisesArray = [];
    for (i = 0; i < req.body.exercise.name.length; i++) {
        let exercise = {
            name: req.body.exercise.name[i],
            weight: req.body.exercise.weight[i],
            sets: req.body.exercise.sets[i],
            reps: req.body.exercise.reps[i],
        };
        exercisesArray.push(exercise);
    }
    req.body.exercise = exercisesArray;
        Workout.create(req.body, function (error, createdWorkout) {
        res.redirect('/workouts');
    });
});

module.exports = router;