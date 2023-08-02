const express = require('express');
const router = express.Router();
const Workout = require('../models/workout');
const Favorite = require('../models/favorite');
const Movement = require('../models/movement');

// index
router.get('/favorites', function (req, res) {
    Favorite.find({
        $or: [
            {createdBy: req.session.userId},
            {sharedWith: req.session.userId},
        ]
    }).populate('exercise.movement')
    .exec(function (error, favorites) {
        res.render('favorite/index.ejs', {
            favorites
        });
    })
})

// create
router.post('/workouts/:id/favorite', function (req, res) {
    Workout.findById(req.params.id, function (error, workout) {
        let { exercise, createdBy } = workout;
        let addFavorite = { exercise, createdBy };
        addFavorite.name = req.body.name;
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
        res.render('favorite/show.ejs', {
            favorite
        });
    });
});



module.exports = router;