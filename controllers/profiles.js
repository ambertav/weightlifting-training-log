const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/user');
const Request = require('../models/request');
const Workout = require('../models/workout');
const { s3Client, s3BaseUrl, PutObjectCommand } = require('../aws');

// user profile
router.get('/users/me', async function (req, res) {
    try {
        const user = await User.findById(req.session.userId);

        const volumePerMovement = await getVolume(req.session.userId);
        const exerciseStats = volumePerMovement.length > 0 ? formatExerciseStats(volumePerMovement) : null;

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
            exerciseStats,
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
        searchResults: null
    });
});

// handle search submission
router.post('/users/search', async function (req, res) {
    try {
        let errorMessage = '';
        const searchResults = await User.find({
            username: {
                $regex: `${req.body.searchTerm.toLowerCase()}`
            }
        })
        .select('username profilePhoto');

        if (searchResults.length === 0) errorMessage = 'No users found, please try again';

        res.render('search.ejs', {
            error: errorMessage,
            searchResults
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

        const volumePerMovement = await getVolume(user._id);
        const exerciseStats = volumePerMovement.length > 0 ? formatExerciseStats(volumePerMovement) : null;

        const existingRequest = await Request.findOne({
            from: { $in: [req.session.userId, user._id] },
            to: { $in: [req.session.userId, user._id] }
        });

        res.render('profile.ejs', {
            user,
            viewer: req.session.userId,
            exerciseStats,
            existingRequest
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

async function getVolume (userId) {
    try {
        const volume = await Workout.aggregate([
            {
                $match: { createdBy: mongoose.Types.ObjectId(userId) } // find user's workouts
            },
            { $unwind: '$exercise' },
            {
                $lookup: { // get access to musclesWorked from each movement
                    from: 'movements',
                    localField: 'exercise.movement',
                    foreignField: '_id',
                    as: 'exercise.movement'
                }
            },
            { $unwind: '$exercise.movement' },
            {
                $group: {
                    _id: '$exercise.movement',
                    volume: {
                        $sum: {
                            $cond: [ // if not cardio, sum volume (sets x reps) per movement id
                                { $eq: ['$exercise.movement.isCardio', false] },
                                { $multiply: ['$exercise.sets', '$exercise.reps'] }, 
                                0
                            ]
                        }
                    },
                    minutes: {
                        $sum: {
                            $cond: [ // if cardio, sum minutes per movement id
                                { $eq: ['$exercise.movement.isCardio', true] }, 
                                '$exercise.minutes',
                                0
                            ]
                        }
                    },
                    calories: {
                        $sum: {
                            $cond: [ // if cardio, sum caloried burned per movement id
                                { $eq: ['$exercise.movement.isCardio', true] }, 
                                '$exercise.caloriesBurned',
                                0
                            ]
                        }
                    },
                    musclesWorked: { $first: '$exercise.movement.musclesWorked' } 
                }
            },              
            {
                $project: {
                    _id: 0,
                    musclesWorked: '$musclesWorked',
                    volume: 1,
                    minutes: 1,
                    calories: 1
                }
            }
        ]);
        
        return volume;
    } catch (error) {
        console.error(error);
        return null;
    }
}

function formatExerciseStats (volumePerMovement) {
    const musclePercent = {};

    let totalVolume = 0;
    let totalMinutes = 0;
    let totalCalories = 0;
  
    for (const movement of volumePerMovement) {
        totalVolume += movement.volume;
        totalMinutes += movement.minutes;
        totalCalories += movement.calories;

        // assuming that each muscle worked within a movement is worked equally:
        // divide movement volume by amount of muscles to get volume per muscle in each movement
        for (const muscle of movement.musclesWorked) {
            musclePercent[muscle] = (musclePercent[muscle] || 0) + (movement.volume / movement.musclesWorked.length);
        }
    }
  
    // convert volume per muscle in each movement to percentage per muscle of total volume
    for (const muscle in musclePercent) {
        musclePercent[muscle] = +(musclePercent[muscle] / totalVolume * 100).toFixed(1);
    }

    // store total minutes and calories burned
    const cardioStats = {
        totalMinutes,
        totalCalories
    }
  
    return {
        musclePercent,
        cardioStats
    };
}


module.exports = router;