const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');

// sign up form
router.get('/signup', function (req, res) {
    res.render('signup.ejs');
});

// handle form submission
router.post('/signup', function (req, res) {
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    req.body.password = hashedPassword;
    User.create(req.body, function (error, newUser) {
        req.session.userId = newUser._id;
        res.redirect('/workouts');
    });
});

// login form
router.get('/login', function (req, res) {
    res.render('login.ejs');
});

// handle form submission
router.post('/login', function (req, res) {
    User.findOne({
            email: req.body.email
        },
        function (error, foundUser) {
            if (!foundUser) return res.redirect('/login');
            const isMatched = bcrypt.compareSync(req.body.password, foundUser.password);
            if (!isMatched) return res.redirect('/login');
            req.session.userId = foundUser._id;
            res.redirect('/workouts');
        });
});

// logout
router.get('/logout', function (req, res) {
    req.session.destroy(function (error) {
        res.redirect('/');
    });
});

module.exports = router;