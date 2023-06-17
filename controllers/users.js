const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Workout = require('../models/workout');
const bcrypt = require('bcrypt');

require('dotenv').config();

const {
    S3Client,
    PutObjectCommand
} = require('@aws-sdk/client-s3');

const s3Config = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
};

const s3Client = new S3Client(s3Config);
const s3BaseUrl = 'https://s3.us-east-2.amazonaws.com/';

// sign up form
router.get('/signup', function (req, res) {
    res.render('signup.ejs', {
        error: null
    });
});

// handle form submission
router.post('/signup', function (req, res) {
    let error = null;
    if (req.body.password !== req.body.passwordConfirmation) {
        error = 'password and password confirmation do not match';
        return res.render('signup.ejs', {
            error
        });
    }
    const hashedPassword = bcrypt.hashSync(req.body.password, 10);
    req.body.password = hashedPassword;
    User.create(req.body, function (error, newUser) {
        req.session.userId = newUser._id;
        res.redirect('/workouts');
    });
});

// login form
router.get('/login', function (req, res) {
    res.render('login.ejs', {
        error: null
    });
});

// handle form submission
router.post('/login', function (req, res) {
    let errorMessage = 'Invalid email or password, please try again.'
    User.findOne({
            email: req.body.email
        },
        function (error, foundUser) {
            if (!foundUser) {
                return res.render('login.ejs', {
                    error: errorMessage
                });
            }
            const isMatched = bcrypt.compareSync(req.body.password, foundUser.password);
            if (!isMatched) {
                return res.render('login.ejs', {
                    error: errorMessage
                });
            }
            req.session.userId = foundUser._id;
            res.redirect('/workouts');
        });
});

// user profile
router.get('/users/me', function (req, res) {
    User.findById(req.session.userId, function (error, user) {
        Workout.find({
            createdBy: req.session.userId,
            isFavorite: true
        }, function (error, favWorkouts) {
            res.render('profile.ejs', {
                user,
                favWorkouts
            });
        });
    });
});

// user profile photo upload
router.put('/users/me/photo/edit', async function (req, res) {
    const file = req.files.profilePhoto;
    const fileInput = file.name.split('.');
    const fileType = fileInput[1];
    const fileName = `${req.session.userId}.${fileType}`

    const bucketParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        Body: file.data,
    };

    try {
        await s3Client.send(new PutObjectCommand(bucketParams));
        User.findById(req.session.userId, function (error, user) {
            user.profilePhoto = `${s3BaseUrl}${bucketParams.Bucket}/${fileName}`
            user.save(function () {
                res.redirect('/users/me');
            });
        })
    } catch (err) {
        console.log('Error', err);
    }
});

// logout
router.get('/logout', function (req, res) {
    req.session.destroy(function (error) {
        res.redirect('/');
    });
});

module.exports = router;