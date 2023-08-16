const express = require('express');
const router = express.Router();
const Workout = require('../models/workout');
const Movement = require('../models/movement');

let exercisesArray = [];

// index
router.get('/workouts', async function (req, res) {
    try {
        const allWorkouts = await Workout.find({
                createdBy: req.session.userId
            })
            .populate('exercise.movement')
            .exec();

        res.render('workout/index.ejs', {
            workouts: allWorkouts
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching workouts.');
    }
});

// new
router.get('/workouts/new', async function (req, res) {
    try {
        const availableMovements = await Movement.find({
                createdBy: {
                    $in: [req.session.userId, null] // allows search for both default and movements created specifically by user
                }
            })
            .exec();
        res.render('workout/new.ejs', {
            movements: availableMovements
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching movements.');
    }
});

// delete
router.delete('/workouts/:id', async function (req, res) {
    try {
        const deletedWorkout = await Workout.findOneAndDelete({
            createdBy: req.session.userId,
            _id: req.params.id
        });
        if (deletedWorkout) res.redirect('/workouts');
        else res.status(404).send('Workout not found, could not delete.');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while deleteing the workout.');
    }
});

// update
router.put('/workouts/:id', function (req, res) {
    if (!Array.isArray(req.body.exercise.movement)) {
        for (const [key, value] of Object.entries(req.body.exercise)) {
            req.body.exercise[key] = [value];
        }
    }
    exercisesArray = [];
    for (i = 0; i < req.body.exercise.movement.length; i++) {
        let exercise = {
            movement: req.body.exercise.movement[i],
            weight: req.body.exercise.weight[i],
            sets: req.body.exercise.sets[i],
            reps: req.body.exercise.reps[i],
            minutes: req.body.exercise.minutes[i],
            caloriesBurned: req.body.exercise.caloriesBurned[i],
        };
        exercisesArray.push(exercise);
    }
    req.body.exercise = exercisesArray;
    Workout.findOneAndUpdate({
        createdBy: req.session.userId,
        _id: req.params.id
    }, req.body, function (error, updatedWorkout) {
        res.redirect('/workouts');
    });
});

// create
router.post('/workouts', function (req, res) {
    if (!Array.isArray(req.body.exercise.movement)) {
        for (const [key, value] of Object.entries(req.body.exercise)) {
            req.body.exercise[key] = [value];
        }
    }
    exercisesArray = [];
    for (i = 0; i < req.body.exercise.movement.length; i++) {
        let exercise = {
            movement: req.body.exercise.movement[i],
            weight: req.body.exercise.weight[i],
            sets: req.body.exercise.sets[i],
            reps: req.body.exercise.reps[i],
            minutes: req.body.exercise.minutes[i],
            caloriesBurned: req.body.exercise.caloriesBurned[i],
        };
        exercisesArray.push(exercise);
    }
    req.body.exercise = exercisesArray;
    req.body.createdBy = req.session.userId;
    Workout.create(req.body, function (error, createdWorkout) {
        res.redirect('/workouts');
    });
});

// edit
router.get('/workouts/:id/edit', async function (req, res) {
    try {
        const foundWorkout = await Workout.findById({
                createdBy: req.session.userId,
                _id: req.params.id
            })
            .populate('exercise.movement')
            .exec();

        const availableMovements = await Movement.find({
                createdBy: {
                    $in: [req.session.userId, null]
                }
            })
            .exec();

        if (foundWorkout) res.render('workout/edit.ejs', {
            workout: foundWorkout,
            movements: availableMovements
        });
        else res.status(404).send('Workout not found, could not edit.');
    } catch (error) {
        console.error(error)
        res.status(500).send('An error occurred while fetching the workout.');
    }
});

// toggle complete
router.put('/workouts/:id/complete', async function (req, res) {
    try {
        if (req.body.change === 'isComplete') {
            const workout = await Workout.findOne({
                createdBy: req.session.userId,
                _id: req.body.id
            });

            if (workout) {
                workout.isComplete = !workout.isComplete;
                await workout.save();
                res.sendStatus(200);
            } else {
                res.status(404).send('Workout not found.');
            }
        }
    } catch (error) {
        console.error(error)
        res.status(500).send('An error occurred while updating workout status.');
    }
});

// show
router.get('/workouts/:id', async function (req, res) {
    try {
        const foundWorkout = await Workout.findById(req.params.id)
            .populate('exercise.movement')
            .exec();

        res.render('workout/show.ejs', {
            workout: foundWorkout
        });
    } catch (error) {
        console.error(error)
        res.status(500).send('An error occurred while fetching the workout.');
    }
});

module.exports = router;