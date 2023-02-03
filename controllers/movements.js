const express = require('express');
const router = express.Router();
const Movement = require('../models/movement');
const data = require('../data');

// seed
router.get('/movements/seed', function (req, res) {
    Movement.deleteMany({}, function (error, results) {
        Movement.create(data, function (error, movements) {
            res.redirect('/movements');
        });
    });
});

// index
router.get('/movements', function (req, res) {
    Movement.find({createdBy: req.session.userId}, function (error, allMovements) {
        res.render('movement/index.ejs', {
            movements: allMovements
        });
    });
});

// new
router.get('/movements/new', function (req, res) {
    res.render('movement/new.ejs');
});

// delete
router.delete('/movements/:id', function (req, res) {
    Movement.findOneAndDelete({createdBy: req.session.userId, _id: req.params.id}, function (error, data) {
        res.redirect('/movements');
    });
});

// update
router.put('/movements/:id', function (req, res) {
    Movement.findOneAndUpdate({createdBy: req.session.userId, _id: req.params.id}, req.body, { new: true }, function (error, updatedMovement) {
        res.redirect('/movements');
    });
});

// create
router.post('/movements', function (req, res) {
    req.body.createdBy = req.session.userId;
    Movement.create(req.body, function (error, createdMovement) {
        res.redirect('/movements');
    });
});

// edit
router.get('/movements/:id/edit', function (req, res) {
    Movement.findById(req.params.id, function (error, foundMovement) {
        res.render('movement/edit.ejs', {
            movement: foundMovement
        });
    });
});


module.exports = router;