import { ExerciseDocument } from '../models/workout';


// based on movement type, makes certain fields on exercise instance required 
    // cardio types -- minutes, distance, caloriesBurned
    // weighted types -- weight, sets, reps 
export default function exerciseSchemaMiddleware (exercise : ExerciseDocument) {
    if (typeof exercise.movement === 'object' && 'type' in exercise.movement) {

        // verify cardio fields on cardio movements
        if (exercise.movement.type  === 'cardio') {

            // throw error if missing:
            if (!exercise.distance || !exercise.minutes || !exercise.caloriesBurned) {
                throw new Error('Cardio exercises require distance, minutes, and calories burned');
            }

            // throw error if present:
            if (exercise.weight || exercise.sets || exercise.reps) {
                throw new Error('Cardio exercises cannot have weight, sets, or reps');
            }
        
        // verify weighted fields on weighted movements
        } else if (exercise.movement.type === 'weighted') {
            
            // throw error if missing:
            if (!exercise.weight || !exercise.sets || !exercise.reps) {
                throw new Error('Weighted exercises require weight, sets, and reps');
            }
            
            // throw error if present:
            if (exercise.distance || exercise.minutes || exercise.caloriesBurned) {
                throw new Error('Weighted exercises cannot have distance, minutes, or calories burned');
            }
        }
    }
}