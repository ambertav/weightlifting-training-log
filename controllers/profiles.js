const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Request = require('../models/request');
const { s3Client, s3BaseUrl, PutObjectCommand } = require('../aws');

// user profile
router.get('/users/me', async function (req, res) {
    try {
        const user = await User.findById(req.session.userId);

        const requests = await Request.find({
            $or: [
                { to: req.session.userId },
                { from: req.session.userId },
            ]
        }).populate({
            path: 'to from',
            select: '_id username'
        }).exec();

        res.render('profile.ejs', {
            user,
            requests,
            viewer: null // indicates that the profile belongs to current user
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
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
        const s3ProfilePhotoUrl = `${s3BaseUrl}${bucketParams.Bucket}/${fileName}`;

        try {
            const user = await User.findById(req.session.userId);
            user.profilePhoto = s3ProfilePhotoUrl;
            await user.save();

            res.redirect('/users/me');

        } catch (userError) {
            console.error('Error updating user profile photo:', userError);
            res.status(500).send('Error updating user profile photo');
        }

    } catch (s3Error) {
        console.error('Error uploading profile photo to AWS S3:', s3Error);
        res.status(500).send('Error uploading profile photo to AWS S3');
    }
});

// user profile update bio
router.put('/users/me/bio/edit', async function (req, res) {
    try {
        const user = await User.findById(req.session.userId);

        user.bio = req.body.bio;
        await user.save();

        res.redirect('/users/me');
    } catch (error) {
        console.error(error);
        res.status(500).send('Error updating user bio');
    }
});

// search for other users
router.get('/users/search', function (req, res) {
    res.render('search.ejs', {
        error: null,
        results: null
    });
});

// handle search submission
router.post('/users/search', async function (req, res) {
    try {
        let errorMessage = '';
        const results = await User.find({
            username: {
                $regex: `${req.body.searchTerm.toLowerCase()}`
            }
        });

        if (results.length === 0) errorMessage = 'No users found, please try again';

        res.render('search.ejs', {
            error: errorMessage,
            results
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// view other profiles
router.get('/users/profile/:username', async function (req, res) {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) return res.status(404).send('User not found');

        if (user._id.toHexString() === req.session.userId) return res.redirect('/users/me');

        const existingRequest = await Request.findOne({
            from: { $in: [req.session.userId, user._id] },
            to: { $in: [req.session.userId, user._id] }
        });

        res.render('profile.ejs', {
            user,
            viewer: req.session.userId,
            existingRequest
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});





module.exports = router;