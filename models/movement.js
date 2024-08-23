const mongoose = require('mongoose');

const Workout = require('./workout'); 


const movementSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxLength: 30,
        trim: true
    },
    description: {
        type: String,
        maxLength: 100,
        default: '',
        trim: true
    },
    musclesWorked: {
        type: Array,
    },
    type: {
        type: String,
        enum: ['cardio', 'weighted'],
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    timestamps: true
});


// ensures that musclesWorked is only required for movements of type 'weighted'
movementSchema.pre('save', function (next) {
    // if type cardio, save with empty array
    if (this.type === 'cardio')
        this.musclesWorked = [];

    // if type weighted, make sure array with at least 1 element 
    else if (this.type === 'weighted') 
        if (!Array.isArray(this.musclesWorked) || this.musclesWorked.length === 0) 
            return next(new Error('Muscles worked is required for weighted movements.'));
        
    next();
});

// removes associated exercises from workout when a movement is deleted
movementSchema.pre('remove', async function (next) {
    try {
        const workouts = await Workout.find({ 'exercise.movement': this._id });

        const movementId = this._id;

        for (const workout of workouts) {
            workout.exercise = workout.exercise.filter(function (exercise) {
                return exercise.movement.toString() !== movementId._id.toString();
            });
            if (workout.exercise.length === 0) await workout.remove();
            else await workout.save();
        }

        next();
    } catch (error) {
        next(error);
    }
});


module.exports = mongoose.model('Movement', movementSchema);