const express = require('express');
const router = express.Router();
const Workout = require('../models/workout');
const Movement = require('../models/movement');

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
            .select('_id name')
            .lean()
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
router.put('/workouts/:id', async function (req, res) {
    try {
        const formattedExerciseArray = formatExercise(req.body.exercise);
        req.body.exercise = formattedExerciseArray;

        const updatedWorkout = await Workout.findOneAndUpdate({
            createdBy: req.session.userId,
            _id: req.params.id
        }, req.body, {
            new: true
        });
        res.redirect('/workouts');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while updating the workout.');
    }
});

// create
router.post('/workouts', async function (req, res) {
    try {
        const formattedExerciseArray = formatExercise(req.body.exercise);

        req.body.exercise = formattedExerciseArray;
        req.body.createdBy = req.session.userId;

        const createdWorkout = await Workout.create(req.body);
        res.redirect('/workouts');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while creating the workout.');
    }
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
            .select('_id name')
            .lean()
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
            workout: foundWorkout,
            message: null
        });
    } catch (error) {
        console.error(error)
        res.status(500).send('An error occurred while fetching the workout.');
    }
});


// formatting the exercise array for create and update routes
function formatExercise(exercise) {
    const exerciseObjects = [];
    const properties = ['movement', 'weight', 'sets', 'reps', 'minutes', 'caloriesBurned']; // all possible properties

    // iterating through indices of 'movement' array to get access to indices of values in each key
    for (let i = 0; i < exercise.movement.length; i++) {
        const exerciseObject = {};
        // iterating through properties to process values
        for (const prop of properties) {
            const value = exercise[prop][i];
            if (value !== '') exerciseObject[prop] = value; // only saving values if not empty string as to not have null keys in database
        }
        exerciseObjects.push(exerciseObject); // adding each formatted exercise to array
    }
    return exerciseObjects;
}


module.exports = router;