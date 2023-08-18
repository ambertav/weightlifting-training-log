const express = require('express');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');

// sign up form
router.get('/signup', function (req, res) {
    res.render('signup.ejs', {
        error: null
    });
});

// handle form submission
router.post('/signup', async function (req, res) {
    try {
        // validate if passwords match
        if (req.body.password !== req.body.passwordConfirmation) {
            const errorMessage = 'Passwords do not match';
            return res.render('signup.ejs', {
                error: errorMessage
            });
        }

        // hash password with bcrypt, save to req.body
        const hashedPassword = await bcrypt.hashSync(req.body.password, 10);
        req.body.password = hashedPassword;

        const newUser = await User.create(req.body);

        // set user session
        req.session.userId = newUser._id;

        res.redirect('/workouts');
    } catch (error) {
        console.error(error);
        const errorMessage = 'An error occurred during signup.';
        res.render('signup.ejs', {
            error: errorMessage
        });
    }
});

// login form
router.get('/login', function (req, res) {
    res.render('login.ejs', {
        error: null
    });
});

// handle form submission
router.post('/login', async function (req, res) {
    try {
        const foundUser = await User.findOne({
            email: req.body.email
        });

        // if no user by email found, send back to login page with error
        if (!foundUser) return res.render('login.ejs', {
            error: 'Invalid email or password, please try again.'
        });
        else {
            const isMatched = await bcrypt.compareSync(req.body.password, foundUser.password);

            // if password provided doesn't match, send back to login page with error
            if (!isMatched) return res.render('login.ejs', {
                error: 'Invalid email or password, please try again.'
            });

            // set user session
            req.session.userId = foundUser._id;

            res.redirect('/workouts');
        }
    } catch (error) {
        console.error(error);
        res.render('login.ejs', {
            error: 'An error occurred during login.'
        });
    }
});

// logout
router.get('/logout', function (req, res) {
    req.session.destroy(function (error) {
        res.redirect('/');
    });
});


module.exports = router;