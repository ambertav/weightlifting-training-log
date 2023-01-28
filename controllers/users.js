const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');

let match = '';

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
        res.redirect('/');
    });
});

module.exports = router;