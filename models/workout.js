const mongoose = require('mongoose');


const workoutSchema = new mongoose.Schema({
    day: {
        type: String,
        required: true
    },
    exercise: [{
        movement: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Movement',
            required: true,
        },
        weight: {
            type: Number,
            min: 0,
        },
        sets: {
            type: Number,
            min: 1,
        },
        reps: {
            type: Number,
            min: 1,
        },
        minutes: {
            type: Number,
            min: 1
        },
        caloriesBurned: {
            type: Number,
            min: 1
        },
    }],
    isComplete: {
        type: Boolean,
        default: false,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('Workout', workoutSchema);