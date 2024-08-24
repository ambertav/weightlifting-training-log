import { Response } from 'express';
import mongoose from 'mongoose';

import { ExerciseDocument } from '../models/workout';

// validate that the movement type's corresponding exercise fields are filled in before saving to database
export function validateExerciseFields (exercise : ExerciseDocument) {
    if (typeof exercise.movement === 'object' && 'type' in exercise.movement) {
        if (exercise.movement.type === 'weighted') {
            if (exercise.weight === null || exercise.sets === null || exercise.reps === null) {
                return 'Weight, sets, and reps are required for weighted movements.';
            }
        } else if (exercise.movement.type === 'cardio') {
            if (exercise.minutes === null || exercise.caloriesBurned === null) {
                return 'Minutes and calories burned are required for cardio movements.';
            }
        }
        return null; // No validation issues
    }
}

// organizes the possible errors for the create and update route 
export function handleValidationErrors(error : mongoose.Error.ValidationError, res : Response, message : string) {
    if (error.errors) {
        const validationErrors = Object.values(error.errors).map((err) => err.message);
        res.status(400).json({ validationErrors });
    } else {
        res.status(500).json({ message });
    }
}