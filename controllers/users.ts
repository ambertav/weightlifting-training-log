import { Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import User from '../models/user';
import bcrypt from 'bcrypt';


// sign up form
export function signupView (req : Request, res : Response) {
    res.render('signup.ejs', {
        error: null
    });
}

// handle form submission
export async function signupUser (req : Request, res : Response) {
    try {
        // validate if passwords match
        if (req.body.password !== req.body.passwordConfirmation) {
            const errorMessage = 'Passwords do not match';
            return res.status(400).render('signup.ejs', {
                error: errorMessage
            });
        }

        const newUser = await User.create(req.body);

        // set user session
        req.session.userId = newUser._id;

        res.redirect('/workouts');
    } catch (error ) {
        if (error instanceof MongoServerError) {
            if (error.code === 11000) {
                let errorMessage = ''
                if (error.keyPattern.email === 1) errorMessage = 'Email is already in use.';
                else if (error.keyPattern.username === 1) errorMessage = 'Username is already in use.';
                return res.status(400).render('signup.ejs', {
                    error: errorMessage
                });
            }
        }
        else {
            const errorMessage = 'An error occurred during signup.';
            res.status(500).render('signup.ejs', {
                error: errorMessage
            });
        }
    }
}

// login form
export function loginView (req : Request, res : Response) {
    res.render('login.ejs', {
        error: null
    });
}

// handle form submission
export async function loginUser (req : Request, res : Response) {
    try {
        const foundUser = await User.findOne({
            email: req.body.email
        });

        // if no user by email found, send back to login page with error
        if (!foundUser) return res.status(401).render('login.ejs', {
            error: 'Invalid email or password, please try again.'
        });
        else {
            const isMatched = await bcrypt.compareSync(req.body.password, foundUser.password);

            // if password provided doesn't match, send back to login page with error
            if (!isMatched) return res.status(401).render('login.ejs', {
                error: 'Invalid email or password, please try again.'
            });

            // set user session
            req.session.userId = foundUser._id;

            res.redirect('/workouts');
        }
    } catch (error) {
        res.status(500).render('login.ejs', {
            error: 'An error occurred during login.'
        });
    }
}

// logout
export function logoutUser (req : Request, res : Response) {
    req.session.destroy(function (error) {
        res.redirect('/');
    });
}