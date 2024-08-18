const mongoose = require('mongoose');
const { exerciseSchemaMiddleware } = require('../middleware/exercise');

const { months } = require('../utilities/constants');


const workoutSchema = new mongoose.Schema({
    day: {
        type: Date,
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
    timestamps: true,
    toJSON: { virtuals: true }
});

// validation for workout.day
workoutSchema.pre('save', async function (next) {
    const now = new Date();
    // calculate 30 days from now
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (this.day < now || this.day > in30Days) 
        return next(new Error('Workout cannot be before today\'s date for more than 30 days in the future'));
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

// virtual property for formatting day for rendering in view
workoutSchema.virtual('formattedDay').get(function () {
    if (this.day instanceof Date) 
        return `${months[this.day.getUTCMonth()]} ${this.day.getUTCDate()}`;

    else return null;
});


module.exports = mongoose.model('Workout', workoutSchema);