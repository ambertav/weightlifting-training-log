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
            .sort({ day: 1 })
            .populate('exercise.movement');

        const workouts = allWorkouts.map(workout => workout.toJSON());


        res.render('workout/index.ejs', {
            workouts
        });

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching workouts', reload: true });
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
        res.status(500).json({ error: 'An error occurred while fetching movements', reload: true });
    }
}

// delete
async function deleteWorkout (req, res) {
    try {
        const workoutToDelete = await Workout.findOne({ // find desired workout
            createdBy: req.session.userId,
            _id: req.params.id
        });

        if (workoutToDelete) {
            await workoutToDelete.deleteOne(); // delete workout
            res.redirect('/workouts');
        }

        else res.status(404).json({ error: 'Workout not found, could not delete', reload: true }); // error if workout not found
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting the workout', reload: true });
    }
}

// update
async function updateWorkout (req, res) {
    try {
        const workout = await Workout.findOne({ createdBy: req.session.userId, _id: req.params.id })
            .populate('exercise.movement');
        
        if (!workout) 
                return res.status(404).send('Workout not found');

        /* req.body.exercise structure example with 3 movements (weighted, cardio, weighted)
            {
                movement: ['movement 1', 'movement 2', 'movement 3'],
                weight: ['weight 1', '', 'weight 3'],
                sets: ['sets 1', '', 'sets 3'],
                reps: ['reps 1', '', 'reps 3'],
                minutes: ['', 'minutes 2', ''],
                caloriesBurned: ['', 'caloriesBurned 2', ''],
            }
        */

         // parses through arrays and creates exercise objects with movement and related fields and values, returns array of those objects   
        const formattedExerciseArray = formatWorkoutExercise(req.body.exercise);
        req.body.exercise = formattedExerciseArray;

        // validate exercise fields
        for (const exercise of req.body.exercise) {
            const validationError = validateExerciseFields(exercise);
            if (validationError) 
                return res.status(400).send(validationError);
       }

        // apply updates and save 
            // works to use validation on pre save      
        Object.assign(workout, req.body);
        await workout.save();


        res.redirect('/workouts');

    } catch (error) {
        const message = 'An error occurred while updating the workout'
        handleValidationErrors(error, res, message);
    }
}

// create
async function createWorkout (req, res) {
    try {
        /* req.body.exercise structure example with 3 movements (weighted, cardio, weighted)
            {
                movement: ['movement 1', 'movement 2', 'movement 3'],
                weight: ['weight 1', '', 'weight 3'],
                sets: ['sets 1', '', 'sets 3'],
                reps: ['reps 1', '', 'reps 3'],
                minutes: ['', 'minutes 2', ''],
                caloriesBurned: ['', 'caloriesBurned 2', ''],
            }
        */

        // parses through arrays and creates exercise objects with movement and related fields and values, returns array of those objects 
        const formattedExerciseArray = formatWorkoutExercise(req.body.exercise); 
        req.body.exercise = formattedExerciseArray;
        req.body.createdBy = req.session.userId;

        // validate exercise fields
        for (const exercise of req.body.exercise) {
            const validationError = validateExerciseFields(exercise);
            if (validationError) 
                return res.status(400).send(validationError);
        }
        
        const newWorkout = await Workout.create(req.body);
        await newWorkout.populate('exercise.movement');

        const createdWorkout = await newWorkout.save();

        res.redirect('/workouts');

    } catch (error) {
        const message = 'An error occurred while creating the workout'
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


        const availableMovements = await Movement.find({
                createdBy: {
                    $in: [req.session.userId, null]
                }
            })
            .select('_id name type')
            .lean();

        if (foundWorkout) res.render('workout/edit.ejs', {
            workout: foundWorkout.toJSON(),
            movements: availableMovements
        });

        else res.status(404).json({ error: 'Workout not found, could not edit', reload: true });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching the workout' });
    }
}

// toggle complete
async function toggleWorkoutCompletion (req, res) {
    try {
        const workout = await Workout.findOneAndUpdate(
            { createdBy: req.session.userId,_id: req.params.id,},
            [ 
                { $set: { isComplete: { $not: '$isComplete' } } }, // toggles boolean by setting to opposite value
            ],
        );

        if (workout) return res.status(200).json({ message: 'Workout updated successfully', reload: true }); // if workout is resolved, send success
        else res.status(404).json({ error: 'Workout not found', reload: true }); // else throw error

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating workout status' });
    }
}

// show
async function showWorkout (req, res) {
    try {
        const foundWorkout = await Workout.findById(req.params.id)
            .populate('exercise.movement')

        res.render('workout/show.ejs', {
            workout: foundWorkout.toJSON(),
            message: null
        });
        
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching the workout', reload: true });
    }
}


module.exports = { getWorkouts, newWorkoutView, deleteWorkout, updateWorkout, createWorkout, editWorkoutView, toggleWorkoutCompletion, showWorkout }
