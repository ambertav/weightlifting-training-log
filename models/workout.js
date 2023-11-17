const mongoose = require('mongoose');
const { exerciseSchemaMiddleware } = require('../middleware/exercise');


const workoutSchema = new mongoose.Schema({
    day: {
        type: String,
        required: true
    },
    exercise: {
        type: [{
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
        required: true,
        default: undefined
    },
    isComplete: {
        type: Boolean,
        default: false,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});


// checks exercise.movement.type and validates required associated fields prior to saving workout
workoutSchema.pre('save', async function (next) {
    // loop through exercises within workout instance
    for (let i = 0; i < this.exercise.length; i++) {
        try {
            // populate movement's type field
            await this.populate(`exercise.${i}.movement`);

            // run through exercise schema middleware (shared with favoriteSchema)
            exerciseSchemaMiddleware(this.exercise[i]);

        } catch (error) {
            // error for population failure
            return next(error);
        }
    }

    // if all exercise validation requirements are met, move to save instance
    next();
});


module.exports = mongoose.model('Workout', workoutSchema);