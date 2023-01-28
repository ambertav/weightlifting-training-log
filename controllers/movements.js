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

router.get('/movements', function (req, res) {
    Movement.find({}, function (error, allMovements) {
        res.render('movement-index.ejs', {
            movements: allMovements
        });
    });
});

module.exports = router;