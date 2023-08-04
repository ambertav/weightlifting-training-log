const express = require('express');
const router = express.Router();
const Workout = require('../models/workout');
const Favorite = require('../models/favorite');
const Request = require('../models/request');
const Movement = require('../models/movement');

// index
router.get('/favorites', function (req, res) {
    Favorite.find({
        accessibleBy: req.session.userId
    }).populate('exercise.movement')
    .exec(function (error, favorites) {
        res.render('favorite/index.ejs', {
            favorites
        });
    })
});

// update -- share favorites
router.put('/favorites/:id/share', function (req, res) {
    Favorite.findOneAndUpdate({
        accessibleBy: req.session.userId,
        _id: req.params.id
    }).exec(function (error, favorite) {
        if (!favorite.accessibleBy.includes(req.body.friend)) {
            favorite.accessibleBy.push(req.body.friend);
        }
        favorite.save(function () {
            res.redirect('/favorites');
        });
    });
});

// update -- remove from favorites
router.put('/favorites/:id/remove', function (req, res) {
    Favorite.findOne({
        accessibleBy: {
            $in: req.session.userId
        },
        _id: req.params.id
    }).exec(function (error, favorite) {
        if (favorite.accessibleBy.length > 1) {
            favorite.accessibleBy.splice(favorite.accessibleBy.indexOf(req.session.userId), 1);
            favorite.save(function () {
                res.redirect('/favorites');
            });
        } else if (favorite.accessibleBy.length === 1) {
            Favorite.findByIdAndDelete(favorite._id, function () {
                res.redirect('/favorites');
            });
        }
    });
});

// copy to workouts
router.post('/favorites/:id/copy', function (req, res) {
    Favorite.findById(req.params.id, function (error, favorite) {
        let { exercise } = favorite;
        let addWorkout = { exercise };
        addWorkout.day = req.body.day;
        addWorkout.createdBy = req.session.userId;
        Workout.create(addWorkout, function (error, createdWorkout) {
            res.redirect('/workouts');
        });
    });
});

// create
router.post('/workouts/:id/favorite', function (req, res) {
    Workout.findById(req.params.id, function (error, workout) {
        let { exercise, createdBy } = workout;
        let addFavorite = { exercise };
        addFavorite.name = req.body.name;
        addFavorite.accessibleBy = [createdBy];
        Favorite.create(addFavorite, function (error, createdFavorite) {
            res.redirect(`/workouts/${workout._id}`);
        });
    });
});

// show
router.get('/favorites/:id', function (req, res) {
    Favorite.findById(req.params.id)
    .populate('exercise.movement')
    .exec(function (error, favorite) {
        Request.find({
            $or: [
            {to: req.session.userId},
            {from: req.session.userId},
        ]}).populate('to').populate('from')
        .exec(function (error, requests) {
            let friends = [];
            for (i = 0; i< requests.length; i++) {
                if (requests[i].to._id.toHexString() === req.session.userId) {
                    friends.push(requests[i].from);
                } else if (requests[i].from._id.toHexString() === req.session.userId) {
                    friends.push(requests[i].to);
                }
            }
            res.render('favorite/show.ejs', {
                favorite,
                friends
            });
        });
    });
});



module.exports = router;