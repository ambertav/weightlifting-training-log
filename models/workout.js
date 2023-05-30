const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workoutSchema = new Schema({
    day: {
        type: String,
        required: true
    },
    exercise: [{
        name: String,
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
    completed: {
        type: Boolean,
        default: false,
        required: true
    },
    isfavorite: Boolean,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Workout', workoutSchema);