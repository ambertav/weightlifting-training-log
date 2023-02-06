const express = require('express');
const router = express.Router();
const Movement = require('../models/movement');

const muscleGroups = ['Deltoids', 'Triceps', 'Biceps', 'Forearms', 'Chest', 'Abdominals', 'Upper Back', 'Lower Back', 'Glutes', 'Quadriceps', 'Hamstrings', 'Calves'];
let muscleArray = [];

// index
router.get('/movements', function (req, res) {
    Movement.find({
        createdBy: {
            $in: [req.session.userId, null]
        }
    }, function (error, allMovements) {
        res.render('movement/index.ejs', {
            movements: allMovements
        });
    });
});

// new
router.get('/movements/new', function (req, res) {
    res.render('movement/new.ejs', {
        muscleGroups,
    });
});

// delete
router.delete('/movements/:id', function (req, res) {
    Movement.findOneAndDelete({
        createdBy: req.session.userId,
        _id: req.params.id
    }, function (error, data) {
        res.redirect('/movements');
    });
});

// update
router.put('/movements/:id', function (req, res) {
    muscleArray = [];
    for (const key of Object.keys(req.body.musclesWorked)) {
        muscleGroups.forEach(function (muscle) {
            if (key === muscle) {
                muscleArray.push(muscle)
            }
        });
    }
    req.body.musclesWorked = muscleArray;
    Movement.findOneAndUpdate({
        createdBy: req.session.userId,
        _id: req.params.id
    }, req.body, {
        new: true
    }, function (error, updatedMovement) {
        res.redirect('/movements');
    });
});

// create
router.post('/movements', function (req, res) {
    muscleArray = [];
    for (const key of Object.keys(req.body.musclesWorked)) {
        muscleGroups.forEach(function (muscle) {
            if (key === muscle) {
                muscleArray.push(muscle)
            }
        });
    }
    req.body.musclesWorked = muscleArray;
    req.body.createdBy = req.session.userId;
    Movement.create(req.body, function (error, createdMovement) {
        res.redirect('/movements');
    });
});

// edit
router.get('/movements/:id/edit', function (req, res) {
    Movement.findById(req.params.id, function (error, foundMovement) {
        res.render('movement/edit.ejs', {
            movement: foundMovement,
            muscleGroups
        });
    });
});


module.exports = router;