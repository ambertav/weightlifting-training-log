const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Workout = require('../models/workout');

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

// user profile
router.get('/users/me', function (req, res) {
    User.findById(req.session.userId, function (error, user) {
        Workout.find({
            createdBy: req.session.userId,
            isFavorite: true
        }, function (error, favWorkouts) {
            res.render('profile.ejs', {
                user,
                favWorkouts,
                viewer: null
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

// view other profiles
router.get('/users/:username', function (req, res) {
    User.findOne({
        username: req.params.username
    }, function (error, user) {
        console.log(req.session.userId);
        console.log(user._id.toHexString());
        if (user._id.toHexString() === req.session.userId) {
            res.redirect('/users/me');
        } else {
            res.render('profile.ejs', {
                user,
                viewer: req.session.userId
            });
        }
    });
})

// search for other users


module.exports = router;