const express = require('express');
const router = express.Router();
const Workout = require('../models/workout');
const Favorite = require('../models/favorite');
const Movement = require('../models/movement');
const Request = require('../models/request');

// index
router.get('/favorites', async function (req, res) {
    try {
        const favorites = await Favorite.find({
                createdBy: req.session.userId
            })
            .lean();

        res.render('favorite/index.ejs', {
            favorites
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching favorites.');
    }
});

// delete
router.delete('/favorites/:id', async function (req, res) {
    try {
        const deletedFavorite = await Favorite.findOneAndDelete({
            createdBy: req.session.userId,
            _id: req.params.id
        });

        if (deletedFavorite) res.redirect('/favorites');
        else res.status(404).send('Favorite not found, could not delete.');

    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while deleteing the favorite.');
    }
});

// update -- share favorites
router.put('/favorites/:id/share', async function (req, res) {
    try {
        const updatedFavorite = await Favorite.findOneAndUpdate({
            accessibleBy: req.session.userId,
            _id: req.params.id
        }, {
            $addToSet: {
                accessibleBy: req.body.friend // adds friend Id if not already present
            }
        }, {
            new: true
        });

        res.redirect('/favorites');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while updating the favorite.');
    }
});

// copy to workouts
router.post('/favorites/:id/copy', async function (req, res) {
    try {
        const favorite = await Favorite.findById(req.params.id);
        if (!favorite) return res.status(404).send('Favorite not found.');

        const { exercise } = favorite;
        const createdBy = req.session.userId;

        const newWorkoutExercise = [];

        for (const ex of exercise) {
            try {
                const movement = await createOrRetrieveMovement(ex, createdBy);
                const exerciseObj = formatExercise(ex, movement);
                newWorkoutExercise.push(exerciseObj);
            } catch (error) {
                console.error(error);
            }
        }

        const newWorkout = {
            day: req.body.day,
            exercise: newWorkoutExercise,
            createdBy: req.session.userId
        }

        const createdWorkout = await Workout.create(newWorkout);

        res.redirect('/workouts');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while copying the favorite and creating the workout.');
    }
});

// create
router.post('/workouts/:id/favorite', async function (req, res) {
    try {
        const workout = await Workout.findById(req.params.id)
            .populate('exercise.movement')
            .lean();
        if (!workout) return res.status(404).send('Workout not found.');

        const { createdBy } = workout;

        const exerciseInfo = workout.exercise.map(function (exercise) {
            const { movement, ...remaining } = exercise;
            return {
                movement: {
                    name: movement.name,
                    musclesWorked: movement.musclesWorked,
                    type: movement.type,
                },
                ...remaining,
            };
        });

        const newFavorite = {
            name: req.body.name,
            exercise: exerciseInfo,
            createdBy
        }

        const createdFavorite = await Favorite.create(newFavorite);

        res.render('workout/show.ejs', {
            workout,
            message: 'Favorite added!'
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while creating the favorite.');
    }
});

// show
router.get('/favorites/:id', async function (req, res) {
    try {
        const favorite = await Favorite.findById(req.params.id)
            .lean();

        const requests = await Request.find({
                $or: [{
                        to: req.session.userId
                    },
                    {
                        from: req.session.userId
                    },
                ]
            })
            .populate({
                path: 'to from',
                select: '_id username'
            })
            .lean();

        const friends = [];
        for (const request of requests) {
            if (request.to._id.toHexString() === req.session.userId) friends.push(request.from);
            else if (request.from._id.toHexString() === req.session.userId) friends.push(request.to);
        }

        res.render('favorite/show.ejs', {
            favorite,
            friends
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching the favorite.');
    }
});

async function createOrRetrieveMovement(exercise, createdBy) {
    let movement = await Movement.findOne({
        name: exercise.movement.name,
        createdBy: { $in: [createdBy, null] }
    });

    if (!movement) {
        movement = await Movement.create({
            name: exercise.movement.name,
            musclesWorked: exercise.movement.musclesWorked,
            type: exercise.movement.type,
            createdBy
        });
    }

    return movement;
}

function formatExercise(exercise, movement) {
    const exerciseObj = {
        movement: movement._id
    }

    const keysByType = {
        weighted: ['weight', 'sets', 'reps'],
        cardio: ['minutes', 'caloriesBurned']
    }

    const keys = keysByType[movement.type]

    for (const key of keys) {
        if (exercise[key] !== undefined) exerciseObj[key] = exercise[key];
    }

    return exerciseObj;
}

module.exports = router;