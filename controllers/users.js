const User = require('../models/user');
const bcrypt = require('bcrypt');


// sign up form
function signupView (req, res) {
    res.render('signup.ejs', {
        error: null
    });
}

// handle form submission
async function signupUser (req, res) {
    try {
        // validate if passwords match
        if (req.body.password !== req.body.passwordConfirmation) {
            const errorMessage = 'Passwords do not match';
            return res.render('signup.ejs', {
                error: errorMessage
            });
        }

        const newUser = await User.create(req.body);

        // set user session
        req.session.userId = newUser._id;

        res.redirect('/workouts');
    } catch (error) {
        console.error(error);
        if (error.code === 11000) {
            let errorMessage = ''
            if (error.keyPattern.email === 1) errorMessage = 'Email is already in use.';
            else if (error.keyPattern.username === 1) errorMessage = 'Username is already in use.';
            return res.render('signup.ejs', {
                error: errorMessage
            });
        }

        const errorMessage = 'An error occurred during signup.';
        res.render('signup.ejs', {
            error: errorMessage
        });
    }
}

// login form
function loginView (req, res) {
    res.render('login.ejs', {
        error: null
    });
}

// handle form submission
async function loginUser (req, res) {
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
}

// logout
function logoutUser (req, res) {
    req.session.destroy(function (error) {
        res.redirect('/');
    });
}


module.exports = { 
    signupView, signupUser, loginView, loginUser, logoutUser,
}