const express = require('express');
const router = express.Router();
const Workout = require('../models/workout');
const Favorite = require('../models/favorite');
const Request = require('../models/request');

// index
router.get('/favorites', async function (req, res) {
    try {
        const favorites = await Favorite.find({
                accessibleBy: req.session.userId
            })
            .populate('exercise.movement')
            .exec();

        res.render('favorite/index.ejs', {
            favorites
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while fetching favorites.');
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

// update -- remove from favorites
router.put('/favorites/:id/remove', async function (req, res) {
    const removedUser = req.session.userId;

    try {
        const updatedFavorite = await Favorite.findOneAndUpdate({
            _id: req.params.id,
            accessibleBy: removedUser
        }, {
            $pull: {
                accessibleBy: removedUser // removes the user from the accessibleBy array
            }
        }, {
            new: true
        }).exec();

        if (!updatedFavorite) return res.status(404).send('Favorite not found or user does not have access.');

        // delete favorite instance if all users have removed themselves to prevent ghost records
        if (updatedFavorite.accessibleBy.length === 0) await Favorite.findByIdAndDelete(updatedFavorite._id);

        res.redirect('/favorites');

    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while removing access from the favorite.');
    }
});

// copy to workouts
router.post('/favorites/:id/copy', async function (req, res) {
    try {
        const favorite = await Favorite.findById(req.params.id);
        if (!favorite) return res.status(404).send('Favorite not found.');

        const { exercise } = favorite;
        const newWorkout = {
            day: req.body.day,
            exercise,
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
        const workout = await Workout.findById(req.params.id);
        if (!workout) return res.status(404).send('Workout not found.');

        const { exercise, createdBy } = workout;
        const newFavorite = {
            name: req.body.name,
            exercise,
            accessibleBy: [createdBy]
        };

        const createdFavorite = await Favorite.create(newFavorite);
        res.redirect(`/workouts/${workout._id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while creating the favorite.');
    }
});

// show
router.get('/favorites/:id', async function (req, res) {
    try {
        const favorite = await Favorite.findById(req.params.id)
            .populate('exercise.movement')
            .exec();

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
            .exec();

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



module.exports = router;