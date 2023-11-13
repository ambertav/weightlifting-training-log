
// validate that the movement type's corresponding exercise fields are filled in before saving to database
function validateExerciseFields(exercise) {
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

// organizes the possible errors for the create and update route 
function handleValidationErrors(error, res, message) {
    console.error(error);
    if (error.errors) {
        const validationErrors = Object.values(error.errors).map((err) => err.message);
        res.status(400).send(validationErrors);
    } else {
        res.status(500).send(message);
    }
}

module.exports = {
    validateExerciseFields, handleValidationErrors,
}