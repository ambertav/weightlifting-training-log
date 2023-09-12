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
            .lean();

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
            .select('_id name type')
            .lean();

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

        const updatedWorkout = await Workout.findOneAndUpdate(
            { createdBy: req.session.userId, _id: req.params.id },
            req.body,
            { new: true }
        )
        .populate('exercise.movement');

        // // Validate exercise fields
        for (const exercise of updatedWorkout.exercise) {
            const validationError = validateExerciseFields(exercise);
            if (validationError) {
                return res.status(400).send(validationError);
            }
        }

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

        const newWorkout = await Workout.create(req.body);
        await newWorkout.populate('exercise.movement');

        // // Validate exercise fields
        for (const exercise of newWorkout.exercise) {
            const validationError = validateExerciseFields(exercise);
            if (validationError) {
                await newWorkout.remove();
                return res.status(400).send(validationError);
            }
        }

        const createdWorkout = await newWorkout.save();

        res.redirect('/workouts');
    } catch (error) {
        console.error(error);
        const message = 'An error occurred while creating the workout.'
        handleValidationErrors(error, res, message);
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
            .lean();

        const availableMovements = await Movement.find({
                createdBy: {
                    $in: [req.session.userId, null]
                }
            })
            .select('_id name type')
            .lean();

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
            .lean();

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

// validate that the movement type's corresponding exercise fields are filled in before saving to database
function validateExerciseFields(exercise) {
    if (exercise.movement.type === 'weighted') {
        if (exercise.weight === null || exercise.sets === null || exercise.reps === null) {
            return 'Weight, sets, and reps are required for weighted movements.';
        }
    } else if (exercise.movement.type === 'cardio') {
        if (exercise.minutes === null || exercise.caloriesBurned === null) {
            return 'Minutes and calories burned are required for cardio movements.';
        }
    }
    return null; // No validation issues
}

// organizes the possible errors for the create and update route 
function handleValidationErrors(error, res, message) {
    console.error(error);
    if (error.errors) {
        const validationErrors = Object.values(error.errors).map((err) => err.message);
        res.status(400).send(validationErrors);
    } else {
        res.status(500).send(message);
    }
}


module.exports = router;