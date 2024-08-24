import { Request, Response } from 'express';
import Favorite from '../models/favorite';
import Workout, { ExerciseDocument } from '../models/workout';
import Movement, { MovementDocument } from '../models/movement';
import User from '../models/user';
import FriendRequest from '../models/friend-request';

import { formatFavoriteExercise } from '../utilities/formatHelpers';

// index
export async function getFavorites (req : Request, res : Response) {
    try {
        const favorites = await Favorite.find({ createdBy: req.session.userId })
            .lean();

        res.render('favorite/index.ejs', {
            favorites,
            viewer: null // indicates that the favorites belongs to current user
        });

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching favorites', reload: true });
    }
}

// delete
export async function deleteFavorite (req : Request, res : Response) {
    try {
        const favoriteToDelete = await Favorite.findOne({
            createdBy: req.session.userId, _id: req.params.id
        });

        if (!favoriteToDelete) return res.status(404).json({ error: 'Favorite not found, could not delete', reload: true });

        await favoriteToDelete.deleteOne();
        res.redirect('/favorites');
    

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while deleteing the favorite', reload: true });
    }
}

// share favorirtes
export async function shareFavorites (req : Request, res : Response) {
    try {
        const originalFavorite = await Favorite.findById({
            createdBy: req.body.friend,
            _id: req.params.id
        })
            .lean();

        // send error if favorite not found
        if (!originalFavorite) return res.status(404).json({ error: 'Favorite not found', reload: true });

        // searching for valid accepted request between users
        const friendship = await FriendRequest.findOne({
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
            createdBy: req.session.userId
        });

        const sharedFavorite = await favoriteToShare.save();

        res.redirect('/favorites');

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while sharing the favorite', reload: true });
    }
}

// copy to workouts
export async function copyFavorite (req : Request, res : Response) {
    try {
        const favorite = await Favorite.findById(req.params.id);
        // send error if favorite not found
        if (!favorite) return res.status(404).json({ error: 'Favorite not found', reload: true });

        const createdBy = req.session.userId!;
        
        const newWorkoutExercise = [];
        const { exercise } = favorite; // destructure to get access to exercise

        // loop over favorite.exercise
        for (const ex of exercise) {
            try {
                // retrieving movement id since favorites saved with movement name
                const movement = await createOrRetrieveMovement(ex, createdBy);
                if (!movement) throw Error('Movement not found');

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
export async function toggleIsPublic (req : Request, res : Response) {
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
export async function createFavorite (req : Request, res : Response) {
    try {
        const workout = await Workout.findById(req.params.id)
            .populate('exercise.movement');
        
        // send error if workout doesn't exist
        if (!workout) return res.status(404).json({ error: 'Workout not found' });

        const { createdBy } = workout;

        const exerciseInfo = workout.exercise.map(function (exercise) {
            const { movement , ...remaining } = exercise; // destructures to access to movement

            if (typeof movement === 'object' && movement !== null && 'name' in movement) {
                return {
                    movement: { // reformats movement to just save name, musclesWorked, type (will not save as an objectId for favorite)
                        name: movement.name,
                        musclesWorked: movement.musclesWorked,
                        type: movement.type,
                    },
                    ...remaining,
                };
            }
        });

        const newFavorite = { // constructs new favorite
            name: req.body.name,
            exercise: exerciseInfo,
            createdBy
        }

        const createdFavorite = await Favorite.create(newFavorite); // creates favorite

        res.render('workout/show.ejs', {
            workout: workout.toJSON(),
            message: 'Favorite added!' // confirmation message
        });

    } catch (error) {
        res.status(500).json({ error: 'An error occurred while creating the favorite', reload: true });
    }
}

// show
export async function showFavorite (req : Request, res : Response) {
    try {
        const favorite = await Favorite.findById(req.params.id)
            .lean();

        // find all friendships user has
        const requests = await FriendRequest.find({
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

export async function viewOtherFavorites (req : Request, res : Response) {
    try {
        const user = await User.findOne({ username: req.params.username })
            .select('-email, -password')
            .lean();
        
        if (!user) return res.status(404).json({ error: 'User not found', reload: true });

        if (user._id.toHexString() === req.session.userId) return res.redirect('/favorites');

        const friendship = await FriendRequest.findOne({
            $or: [
                { from: user._id, to: req.session.userId },
                { from: req.session.userId, to: user._id }
            ]
        });

        if (!friendship) return res.status(404).json({ error: 'Cannot view this user\'s favorites', reload: true });

        const favorites = await Favorite.find({ createdBy: user._id, isPublic: true })
            .lean();

        res.render('favorite/index.ejs', {
                favorites,
                user,
                viewer: true  // indicates that there is a viewer
            });
            
    } catch (error) {
        res.status(500).json({ error: 'Error occured while fetching other user favorites', reload: true });
    }
}

// sees if the movement within the favorite exists in reference to user, creates the movement if not
async function createOrRetrieveMovement (exercise : ExerciseDocument, createdBy : string) {

    if (typeof exercise.movement === 'object' && 'name' in exercise.movement) {
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
}