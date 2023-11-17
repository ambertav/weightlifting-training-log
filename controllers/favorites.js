const Favorite = require('../models/favorite');
const Workout = require('../models/workout');
const Movement = require('../models/movement');
const Request = require('../models/request');

const { formatFavoriteExercise } = require('../utilities/formatHelpers');

// index
async function getFavorites (req, res) {
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
}

// delete
async function deleteFavorite (req, res) {
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
}

// share favorirtes
async function shareFavorites (req, res) {
    try {
        const originalFavorite = await Favorite.findOne({
            createdBy: req.session.userId,
            _id: req.params.id
        })
        .lean();

        if (!originalFavorite) return res.status(404).send('Favorite not found.');

        // New instance of favorite, now createdBy the friend with whom the user selects to share with
        const favoriteToShare = new Favorite({
            name: originalFavorite.name,
            exercise: originalFavorite.exercise,
            createdBy: req.body.friend
        });

        const sharedFavorite = await favoriteToShare.save();

        res.redirect('/favorites');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while sharing the favorite.');
    }
}

// copy to workouts
async function copyFavorite (req, res) {
    try {
        const favorite = await Favorite.findById(req.params.id);
        if (!favorite) return res.status(404).send('Favorite not found.');

        const { exercise } = favorite;
        const createdBy = req.session.userId;

        const newWorkoutExercise = [];

        for (const ex of exercise) {
            try {
                const movement = await createOrRetrieveMovement(ex, createdBy);
                const exerciseObj = formatFavoriteExercise(ex, movement);
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
}

// create
async function createFavorite (req, res) {
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
}

// show
async function showFavorite (req, res) {
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
}

// sees if the movement within the favorite exists in reference to user, creates the movement if not
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


module.exports = {
    getFavorites, deleteFavorite, shareFavorites, copyFavorite, createFavorite, showFavorite,
}