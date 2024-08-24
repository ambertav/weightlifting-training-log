import mongoose from 'mongoose';
import { ExerciseDocument } from '../models/workout';


// based on movement type, makes certain fields on exercise instance required 
    // cardio types -- minutes, distance, caloriesBurned
    // weighted types -- weight, sets, reps 
export default function exerciseSchemaMiddleware (exercise : ExerciseDocument) {
    if (typeof exercise.movement === 'object' && 'type' in exercise.movement) {
        const error = new mongoose.Error.ValidationError();

        // verify cardio fields on cardio movements
        if (exercise.movement.type  === 'cardio') {

            // throw error if missing:
            if (!exercise.distance || !exercise.minutes || !exercise.caloriesBurned) {
                error.message = 'Cardio exercises require distance, minutes, and calories burned';
                throw error;
            }

            // throw error if present:
            if (exercise.weight || exercise.sets || exercise.reps) {
                error.message = 'Cardio exercises cannot have weight, sets, or reps';
                throw error;
            }
        
        // verify weighted fields on weighted movements
        } else if (exercise.movement.type === 'weighted') {
            
            // throw error if missing:
            if (!exercise.weight || !exercise.sets || !exercise.reps) {
                error.message = 'Weighted exercises require weight, sets, and reps';
                throw error;
            }
            
            // throw error if present:
            if (exercise.distance || exercise.minutes || exercise.caloriesBurned) {
                error.message = 'Weighted exercises cannot have distance, minutes, or calories burned';
                throw error;
            }
        }
    }
}