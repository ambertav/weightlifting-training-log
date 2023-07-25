const express = require('express');
const router = express.Router();
const Workout = require('../models/workout');
const Favorite = require('../models/favorite');
const Movement = require('../models/movement');


// create
router.post('/workouts/:id/favorite', function (req, res) {
    Workout.findById(req.params.id, function (error, workout) {
        let { exercise, createdBy } = workout 
        let addFavorite = { exercise, createdBy }
        addFavorite.name = 'default';
        Favorite.create(addFavorite, function (error, createdFavorite) {
            res.redirect(`/workouts/${workout._id}`);
        });
    });
});




module.exports = router;