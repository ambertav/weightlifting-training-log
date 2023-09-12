const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Workout = require('./workout'); 

const movementSchema = new Schema({
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
        required: true
    },
    type: {
        type: String,
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    timestamps: true
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