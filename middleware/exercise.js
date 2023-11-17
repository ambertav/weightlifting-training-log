// based on movement type, makes certain fields on exercise instance required 
    // cardio types -- minutes, caloriesBurned
    // weighted types -- weight, sets, reps 
function exerciseSchemaMiddleware (exercise) {

    // verify cardio fields on cardio movements
    if (exercise.movement.type === 'cardio') {

        // throw error if missing:
        if (!exercise.minutes || !exercise.caloriesBurned) {
            throw new Error('Cardio exercises require minutes and calories burned');
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
        if (exercise.minutes || exercise.caloriesBurned) {
            throw new Error('Weighted exercises cannot have minutes and calories burned');
        }
    }
}


module.exports = { exerciseSchemaMiddleware }