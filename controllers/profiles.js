const mongoose = require('mongoose');
const User = require('../models/user');
const Request = require('../models/request');
const Workout = require('../models/workout');
const { s3Client, s3BaseUrl, PutObjectCommand } = require('../config/awsConfig');

const { formatExerciseStats } = require('../utilities/formatHelpers');

// user profile
async function getOwnProfile (req, res) {
    try {
        const user = await User.findById(req.session.userId)
            .select('-email -password')
            .lean();

        const volumePerMovement = await getVolume(req.session.userId);
        const exerciseStats = volumePerMovement.length > 0 ? formatExerciseStats(volumePerMovement) : null;

        const requests = await Request.find({
            $or: [
                { to: req.session.userId },
                { from: req.session.userId },
            ]
        })
        .populate({ path: 'to from', select: '_id username' })
        .lean();

        const awaiting = filterRequests(requests, 'pending');
        const friendships = filterRequests(requests, 'accepted');

        res.render('profile.ejs', {
            user,
            awaiting,
            friendships,
            exerciseStats,
            viewer: null // indicates that the profile belongs to current user
        });

    } catch (error) {
        res.status(500).json({ error: 'Error occured while fetching profile', reload: true });
    }
}

// user profile photo upload
async function uploadPhoto (req, res) {
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

            // prevents caching of previous photo, removes confusion for user
            res.setHeader('Cache-Control', 'no-cache');
            res.redirect('/users/me');

        } catch (userError) {
            console.error(userError);
            res.status(500).json({ error: 'Error updating user profile photo', reload: true });
        }

    } catch (s3Error) {
        console.error(s3Error);
        res.status(500).json({ error: 'Error uploading profile photo to AWS S3', reload: true });
    }
}

// user profile update bio
async function updateProfile (req, res) {
    try {
        const user = await User.findById(req.session.userId);

        user.bio = req.body.bio;
        await user.save();

        res.redirect('/users/me');

    } catch (error) {
        res.status(500).json({ error: 'Error updating user bio', reload: true });
    }
}

// search for other users
function searchView (req, res) {
    res.render('search.ejs', {
        error: null,
        searchResults: null
    });
}

// handle search submission
async function handleSearch (req, res) {
    try {
        let errorMessage = '';
        const searchResults = await User.find({
            _id: { $ne: req.session.userId }, // remove req user from search
            username: {
                $regex: `${req.body.searchTerm.toLowerCase()}`
            }
        })
        .select('username profilePhoto')
        .lean();

        if (searchResults.length === 0) errorMessage = 'No users found, please try again';

        res.render('search.ejs', {
            error: errorMessage,
            searchResults
        });

    } catch (error) {
        res.status(500).json({ error: 'Error searching for users', reload: true });
    }
}

// view other profiles
async function viewOtherProfile (req, res) {
    try {
        const user = await User.findOne({ username: req.params.username })
            .select('-email, -password')
            .lean();

        if (!user) return res.status(404).json({ error: 'User not found', reload: true });

        // redirects user to controller for own profile
        if (user._id.toHexString() === req.session.userId) return res.redirect('/users/me');

        const volumePerMovement = await getVolume(user._id);
        const exerciseStats = volumePerMovement.length > 0 ? formatExerciseStats(volumePerMovement) : null;

        const existingRequest = await Request.findOne({
            $or: [
                { from: req.session.userId, to: user._id },
                { from: user._id, to: req.session.userId }
            ]
        })
        .populate({ path: 'to from', select: '_id username' })
        .lean();

        res.render('profile.ejs', {
            user,
            viewer: req.session.userId,
            exerciseStats,
            existingRequest
        });

    } catch (error) {
        res.status(500).json({ error: 'Error occured while fetching user profile', reload: true });
    }
}

async function getVolume (userId) {
    try {
        const volume = await Workout.aggregate([
            {
                $match: { createdBy: new mongoose.Types.ObjectId(userId) } // find user's workouts
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
                                { $eq: ['$exercise.movement.type', 'weighted'] },
                                { $multiply: ['$exercise.sets', '$exercise.reps'] }, 
                                0
                            ]
                        }
                    },
                    minutes: {
                        $sum: {
                            $cond: [ // if cardio, sum minutes per movement id
                                { $eq: ['$exercise.movement.type', 'cardio'] }, 
                                '$exercise.minutes',
                                0
                            ]
                        }
                    },
                    calories: {
                        $sum: {
                            $cond: [ // if cardio, sum caloried burned per movement id
                                { $eq: ['$exercise.movement.type', 'cardio'] }, 
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

function filterRequests (requests, status) {
    return requests.filter(function (req) {
        return req.status === status;
    });
}


module.exports = { getOwnProfile, uploadPhoto, updateProfile, searchView, handleSearch, viewOtherProfile }