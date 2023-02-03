const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const workoutSchema = new Schema ({
    day: {
        type: String,
        required: true
    },
    exercise: [{
        name: String,
        weight: {
            type: Number,
            min: 0,
            required: true
        },
        sets: {
            type: Number,
            min: 1,
            required: true
        },
        reps: {
            type: Number,
            min: 1,
            required: true
        }, 
    }],
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Workout', workoutSchema);