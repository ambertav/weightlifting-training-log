const Workout = require('../models/workout');
const Movement = require('../models/movement');

const { validateExerciseFields, handleValidationErrors } = require('../utilities/validationHelpers');
const { formatWorkoutExercise } = require('../utilities/formatHelpers');

// index
async function getWorkouts (req, res) {
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
}

// new
async function newWorkoutView (req, res) {
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
}

// delete
async function deleteWorkout (req, res) {
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
}

// update
async function updateWorkout (req, res) {
    try {
        const formattedExerciseArray = formatWorkoutExercise(req.body.exercise);
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
        handleValidationErrors(error, res, message);
    }
}

// create
async function createWorkout (req, res) {
    try {
        const formattedExerciseArray = formatWorkoutExercise(req.body.exercise);
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
}

// edit
async function editWorkoutView (req, res) {
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
}

// toggle complete
async function toggleWorkoutCompletion (req, res) {
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
}

// show
async function showWorkout (req, res) {
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
}


module.exports = {
    getWorkouts, newWorkoutView, deleteWorkout, updateWorkout, createWorkout, editWorkoutView, toggleWorkoutCompletion, showWorkout,
}
