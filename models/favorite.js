const mongoose = require('mongoose');
const { exerciseSchemaMiddleware } = require('../middleware/exercise');


const favoriteSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxLength: 30,
        trim: true
    },
    exercise: {
        type: [{
            movement: {
                name: {
                    type: String,
                    required: true,
                    maxLength: 30,
                    trim: true
                },
                musclesWorked: {
                    type: Array,
                    required: true
                },
                type: {
                    type: String,
                    enum: ['cardio', 'weighted'],
                    required: true
                },
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
    isPublic: {
        type: Boolean,
        default: true,
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

favoriteSchema.pre('save', async function (next) {
    // loop through exercises within favorite instance
    for (const exercise of this.exercise) {

        // run through exercise schema middleware (shared with workoutSchema)
        exerciseSchemaMiddleware(exercise);
    }

    next();
});


module.exports = mongoose.model('Favorite', favoriteSchema);