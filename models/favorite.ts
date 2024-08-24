import mongoose from 'mongoose';
import exerciseSchemaMiddleware from '../middleware/exercise';
import { ExerciseDocument } from './workout';
import { MovementDocument } from './movement';
import { UserDocument } from './user';


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

        const { weight, sets, reps, distance, minutes, caloriesBurned, movement } = exercise;

        const exerciseObj : Partial<ExerciseDocument> = {
            weight: weight ?? undefined,
            sets: sets ?? undefined,
            reps: reps ?? undefined,
            distance: distance ?? undefined,
            minutes: minutes ?? undefined,
            caloriesBurned: caloriesBurned ?? undefined,
            ...(movement ? { movement : movement as Partial<MovementDocument> } : {})
        };

        exerciseSchemaMiddleware(exerciseObj as ExerciseDocument);
    }

    next();
});

export interface FavoriteDocument extends mongoose.Document {
    name : string;
    exercise : ExerciseDocument[];
    isPublic : boolean;
    createdBy : mongoose.Types.ObjectId | UserDocument;
}


export default mongoose.model <FavoriteDocument> ('Favorite', favoriteSchema);