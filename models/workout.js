const mongoose = require('mongoose');


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

            const exercise = this.exercise[i];

            // verify cardio fields on cardio movements
            if (exercise.movement.type === 'cardio') {
                // throw error if missing:
                if (!exercise.minutes || !exercise.caloriesBurned) {
                    const error = new Error('Cardio exercises require minutes and calories burned');
                    return next(error);
                }

                // throw error if present:
                if (exercise.weight || exercise.sets || exercise.reps) {
                    const error = new Error('Cardio exercises cannot have weight, sets, or reps');
                    return next(error);
                }

            // verify weighted fields on weighted movements
            } else if (exercise.movement.type === 'weighted') {
                // throw error if missing:
                if (!exercise.weight || !exercise.sets || !exercise.reps) {
                    const error = new Error('Weighted exercises require weight, sets, and reps');
                    return next(error);
                }
                
                // throw error if present:
                if (exercise.minutes || exercise.caloriesBurned) {
                    const error = new Error('Weighted exercises cannot have minutes and calories burned');
                    return next(error);
                }

            } else { // throw error if exercise.movement doesn't have a valid type
                const error = new Error('Exercises require a movement with a valid type');
                return next(error);
            }
        } catch (error) {
            // error for population failure
            return next(error);
        }
    }

    // if all exercise validation requirements are met, move to save instance
    next();
});


module.exports = mongoose.model('Workout', workoutSchema);