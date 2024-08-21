const Favorite = require('../models/favorite');
const Workout = require('../models/workout');
const Movement = require('../models/movement');
const Request = require('../models/request');

const { formatFavoriteExercise } = require('../utilities/formatHelpers');

// index
async function getFavorites (req, res) {
    try {
        const favorites = await Favorite.find({ createdBy: req.session.userId })
            .lean();

        res.render('favorite/index.ejs', {
            favorites
        });

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching favorites', reload: true });
    }
}

// delete
async function deleteFavorite (req, res) {
    try {
        const favoriteToDelete = await Favorite.findOne({
            createdBy: req.session.userId, _id: req.params.id
        });

        if (favoriteToDelete) {
            await favoriteToDelete.deleteOne();
            res.redirect('/favorites');
        }
        
        else res.status(404).json({ error: 'Favorite not found, could not delete', reload: true });

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while deleteing the favorite', reload: true });
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

        // send error if favorite not found
        if (!originalFavorite) return res.status(404).json({ error: 'Favorite not found', reload: true });

        // searching for valid accepted request between users
        const friendship = await Request.findOne({
            $or: [
                { from: req.body.friend, to: req.session.userId },
                { from: req.session.userId, to: req.body.friend }
            ]
        });

        // send error if friendship is not found
        if (!friendship) return res.status(403).json({ error: 'Favorites can only be shared between friends', reload: true });

        // new instance of favorite, now createdBy = friend with whom the user selects to share with
        const favoriteToShare = new Favorite({
            name: originalFavorite.name,
            exercise: originalFavorite.exercise,
            createdBy: req.body.friend
        });

        const sharedFavorite = await favoriteToShare.save();

        res.redirect('/favorites');

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while sharing the favorite', reload: true });
    }
}

// copy to workouts
async function copyFavorite (req, res) {
    try {
        const favorite = await Favorite.findById(req.params.id);
        // send error if favorite not found
        if (!favorite) return res.status(404).json({ error: 'Favorite not found', reload: true });

        const createdBy = req.session.userId;
        
        const newWorkoutExercise = [];
        const { exercise } = favorite; // destructure to get access to exercise

        // loop over favorite.exercise
        for (const ex of exercise) {
            try {
                // retrieving movement id since favorites saved with movement name
                const movement = await createOrRetrieveMovement(ex, createdBy);
                // formats exercise object with required fields based on movement type
                const exerciseObj = formatFavoriteExercise(ex, movement);
                // acculumates exercise objects
                newWorkoutExercise.push(exerciseObj);
            } catch (error) {
                console.error(error);
            }
        }

        const newWorkout = { // constructs new workout
            day: req.body.day,
            exercise: newWorkoutExercise,
            createdBy: req.session.userId
        }

        const createdWorkout = await Workout.create(newWorkout); // creates workout

        res.redirect('/workouts');

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while copying the favorite and creating the workout', reload: true });
    }
}

// toggle isPublic status
async function toggleIsPublic (req, res) {
    try {
        const favorite = await Favorite.findOneAndUpdate(
            { createdBy: req.session.userId, _id: req.params.id },
            [ 
                { $set: { isPublic: { $not: '$isPublic' } } }, // toggles boolean by setting to opposite value
            ],
        );

        // if favorite is resolved, send success
        if (favorite) return res.status(200).json({ message: 'Favorite updated successfully', reload: true }); 
        // else throw error
        else return res.status(404).json({ error: 'Favorite not found', reload: true });

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while toggling the favorite\'s public status', reload: true });
    }
}


// create
async function createFavorite (req, res) {
    try {
        const workout = await Workout.findById(req.params.id)
            .populate('exercise.movement')
            .lean();
        
        // send error if workout doesn't exist
        if (!workout) return res.status(404).json({ error: 'Workout not found' });

        const { createdBy } = workout;

        const exerciseInfo = workout.exercise.map(function (exercise) {
            const { movement, ...remaining } = exercise; // destructures to access to movement
            return {
                movement: { // reformats movement to just save name, musclesWorked, type (will not save as an objectId for favorite)
                    name: movement.name,
                    musclesWorked: movement.musclesWorked,
                    type: movement.type,
                },
                ...remaining,
            };
        });

        const newFavorite = { // constructs new favorite
            name: req.body.name,
            exercise: exerciseInfo,
            createdBy
        }

        const createdFavorite = await Favorite.create(newFavorite); // creates favorite

        res.render('workout/show.ejs', {
            workout,
            message: 'Favorite added!' // confirmation message
        });

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while creating the favorite', reload: true });
    }
}

// show
async function showFavorite (req, res) {
    try {
        const favorite = await Favorite.findById(req.params.id)
            .lean();

        // find all friendships user has
        const requests = await Request.find({
                $or: [
                    { to: req.session.userId },
                    { from: req.session.userId },
                ]
            })
            // populating both to and from fields
            .populate({ path: 'to from', select: '_id username' }) 
            .lean();

        const friends = [];
        // formats list of friends to extract other user's username and id, removes req.session user from data
        for (const request of requests) {
            if (request.to._id.toHexString() === req.session.userId) friends.push(request.from);
            else if (request.from._id.toHexString() === req.session.userId) friends.push(request.to);
        }

        res.render('favorite/show.ejs', {
            favorite,
            friends // passes array of friends to render for share favorite form
        });

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching the favorite', reload: true });
    }
}

// sees if the movement within the favorite exists in reference to user, creates the movement if not
async function createOrRetrieveMovement (exercise, createdBy) {
    // search for movement
    let movement = await Movement.findOne({
        name: exercise.movement.name,
        createdBy: { $in: [createdBy, null] }
    });

    // if the movement doesn't exist...
    if (!movement) {
        // create the movement
        movement = await Movement.create({
            name: exercise.movement.name,
            musclesWorked: exercise.movement.musclesWorked,
            type: exercise.movement.type,
            createdBy // assigned createdBy to req.session.userId
        });
    }
    return movement;
}


module.exports = { getFavorites, deleteFavorite, shareFavorites, copyFavorite, toggleIsPublic, createFavorite, showFavorite }