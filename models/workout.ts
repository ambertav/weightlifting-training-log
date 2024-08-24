import mongoose from 'mongoose';
import { MovementDocument } from './movement';
import exerciseSchemaMiddleware from '../middleware/exercise';

import { months } from '../utilities/constants';
import { UserDocument } from './user';


const workoutSchema = new mongoose.Schema <WorkoutDocument> ({
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
            distance: {
                type: Number,
                min: 1
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


// checks exercise.movement.type and validates required associated fields prior to saving workout
workoutSchema.pre('save', async function (next) {
    // loop through exercises within workout instance
    for (let i = 0; i < this.exercise.length; i++) {
        try {
            // populate movement's type field
            await this.populate(`exercise.${i}.movement`);

            // run through exercise schema middleware (shared with favoriteSchema)
            exerciseSchemaMiddleware(this.exercise[i]);

        } catch (error : any) {
            // error for population failure
            return next(error);
        }
    }

    // if all exercise validation requirements are met, move to save instance
    next();
});

// validation for workout.day
workoutSchema.pre('save', async function (next) {
    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    // calculate 30 days from now
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (this.day < now || this.day > in30Days) {
        const error = new mongoose.Error.ValidationError();
        error.message = 'Workout cannot be before today\'s date or more than 30 days in the future';
        return next(error);
    }

    next();
});

// virtual property for formatting day for rendering in view
workoutSchema.virtual('formattedDay').get(function () {
    if (this.day instanceof Date) 
        return `${months[this.day.getUTCMonth()]} ${this.day.getUTCDate()}`;

    else return null;
});


export interface ExerciseDocument extends mongoose.Document {
    movement : mongoose.Types.ObjectId | MovementDocument | Partial<MovementDocument>;
    weight? : Number;
    reps? : Number;
    sets? : Number;
    distance? : Number;
    minutes? : Number;
    caloriesBurned? : Number;
}

export interface WorkoutDocument extends mongoose.Document {
    day : Date;
    exercise : ExerciseDocument[];
    isComplete : boolean;
    createdBy : mongoose.Types.ObjectId | Partial<UserDocument>;
}


export default mongoose.model <WorkoutDocument> ('Workout', workoutSchema);