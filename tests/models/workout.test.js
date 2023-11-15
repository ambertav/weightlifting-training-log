const mongoose = require('mongoose');

const Workout = require('../../models/workout');
const User = require('../../models/user');
const Movement = require('../../models/movement');
const { expectValidationError } = require('../testUtilities');
const movementData = require('../../seed/movementData');

require('dotenv').config();

// global variables used for referenced documents throughout tests
let userId = '';
let weightedId = '';
let cardioId = '';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({});
    await Movement.deleteMany({});
    await Workout.deleteMany({});

    const user = await User.create({
        firstName: 'Jane',
        username: 'jane_doe',
        email: 'jane@example.com',
        password: 'password'
    });
    userId = user._id;

    const weightedMovement = await Movement.create(movementData[0]);
    weightedId = weightedMovement._id;

    const cardioMovement = await Movement.create(movementData[movementData.length - 1]);
    cardioId = cardioMovement._id;
});

afterAll(async () => {
    await mongoose.connection.close();
});


describe('Workout model', () => {
    test('should successfully create a workout with valid data', async () => {
        const validWorkoutData = {
            day: 'Monday',
            exercise: [{
                movement: weightedId,
                weight: 100,
                sets: 1,
                reps: 1,
            }],
            createdBy: userId
        }

        const workout = await Workout.create(validWorkoutData);

        // ensures that workout was created
        expect(workout).toBeDefined();
        
        // ensures that created workout has the input's data
        expect(workout.day).toEqual(validWorkoutData.day);
        expect(workout.exercise[0].movement._id).toEqual(validWorkoutData.exercise[0].movement);
        expect(workout.exercise[0].weight).toEqual(validWorkoutData.exercise[0].weight);
        expect(workout.exercise[0].sets).toEqual(validWorkoutData.exercise[0].sets);
        expect(workout.exercise[0].reps).toEqual(validWorkoutData.exercise[0].reps);
        expect(workout.createdBy).toEqual(validWorkoutData.createdBy);
    });

    test('should throw mongoose validation error when workout required fields are missing', async () => {
        const invalidWorkoutData = {}
        const error = await expectValidationError(Workout, invalidWorkoutData);
        
        // ensures errors for each missing required field are included
        expect(error.errors.day).toBeDefined();
        expect(error.errors.exercise).toBeDefined();
        expect(error.errors.createdBy).toBeDefined();

        // ensures presence of error message
        expect(error._message).toEqual('Workout validation failed');
    });

    test('should throw mongoose validation error when invalid exercise inputs are used', async () => {
        const invalidExerciseData = {
            day: 'Monday',
            exercise: [{
                movement: 'invalid',
                weight: -1,
                sets: 0,
                reps: 0,
                minutes: -1,
                caloriesBurned: -1,
            }],
            createdBy: userId
        }

        const error = await expectValidationError(Workout, invalidExerciseData);

        // ensures errors for each min value violation are included
        expect(error.errors['exercise.0.movement']).toBeDefined();
        expect(error.errors['exercise.0.weight']).toBeDefined();
        expect(error.errors['exercise.0.sets']).toBeDefined();
        expect(error.errors['exercise.0.reps']).toBeDefined();
        expect(error.errors['exercise.0.minutes']).toBeDefined();
        expect(error.errors['exercise.0.caloriesBurned']).toBeDefined();

        // final error message check
        expect(error._message).toEqual('Workout validation failed');
    });

    test('should allow population of referenced model isntances', async () => {
        const workout = await Workout.findOne()
            .populate('exercise.movement createdBy');

        // ensures that referenced documents are populated
        expect(workout.createdBy.username).toBeDefined();
        expect(workout.exercise[0].movement.name).toBeDefined();
        
    });

    test('should add default value to isComplete field', async () => {
        const workout = await Workout.findOne()

        // ensures that successfully created workout has isComplete field with default value
        expect(workout.isComplete).toBeDefined();
        expect(workout.isComplete).toEqual(false);
    });

    test('should only reference a valid user', async () => {
        const workoutWithInvalidUser = {
            day: 'Monday',
            exercise: [{
                    movement: weightedId,
                    weight: 100,
                    sets: 1,
                    reps: 1,
            }],
            createdBy: 'invalid'
        }

        const error = await expectValidationError(Workout, workoutWithInvalidUser);

        // ensures that valid userId must be included
        expect(error.errors.createdBy).toBeDefined();
        expect(error._message).toEqual('Workout validation failed');

    });
});

describe('Workout model\'s required exercise fields middleware', () => {
    // global variable with common workout data to be use accross schema middleware tests
    const baseWorkoutData = {}

    beforeEach(async () => {
        await Workout.deleteMany({}); // clears database to utilize count documents for each test

        // fills out required data
        baseWorkoutData.day = 'Monday';
        baseWorkoutData.createdBy = userId;
    });
    
    test('should throw error when cardio type movement exercises are missing required cardio fields', async () => {
        const cardioWorkoutMissingFields = {
            ...baseWorkoutData,
            exercise: [{
                movement: cardioId,
            }]
        }

        try {
            await Workout.create(cardioWorkoutMissingFields);
            // fail if success
            fail('Expected an error but did not receive one');
        } catch (error) {
            // verifies middleware's error message
            expect(error.message).toBe('Cardio exercises require minutes and calories burned');
        }

        // ensures that workout was not saved in database
        const workoutCount = await Workout.countDocuments({});
        expect(workoutCount).toBe(0);
    });

    test('should throw error when cardio type movement exercises have weighted required fields', async () => {
        const cardioWorkoutWrongFields = {
            ...baseWorkoutData,
            exercise: [{
                movement: cardioId,
                weight: 100,
                sets: 1,
                reps: 1,
                minutes: 1,
                caloriesBurned: 1,
            }]
        }

        try {
            await Workout.create(cardioWorkoutWrongFields);
            // fail if success
            fail('Expected an error but did not receive one');
        } catch (error) {
            // verifies middleware's error message
            expect(error.message).toBe('Cardio exercises cannot have weight, sets, or reps');
        }

        // ensures that workout was not saved in database
        const workoutCount = await Workout.countDocuments({});
        expect(workoutCount).toBe(0);
    });

    test('should throw error when weighted type movement exercises are missing required weighted fields', async () => {
        const weightedWorkoutMissingFields = {
            ...baseWorkoutData,
            exercise: [{
                movement: weightedId,
            }]
        }

        try {
            await Workout.create(weightedWorkoutMissingFields);
            // fail if success
            fail('Expected an error but did not receive one');
        } catch (error) {
            // verifies middleware's error message
            expect(error.message).toBe('Weighted exercises require weight, sets, and reps');
        }

        // ensures that workout was not saved in database
        const workoutCount = await Workout.countDocuments({});
        expect(workoutCount).toBe(0);
    });

    test('should throw error when weighted type movement exercises have cardio required fields', async () => {
        const weightedWorkoutWrongFields = {
            ...baseWorkoutData,
            exercise: [{
                movement: weightedId,
                weight: 100,
                sets: 1,
                reps: 1,
                minutes: 1,
                caloriesBurned: 1,
            }]
        }

        try {
            await Workout.create(weightedWorkoutWrongFields);
            // fail if success
            fail('Expected an error but did not receive one');
        } catch (error) {
            // verifies middleware's error message
            expect(error.message).toBe('Weighted exercises cannot have minutes and calories burned');
        }

        // ensures that workout was not saved in database
        const workoutCount = await Workout.countDocuments({});
        expect(workoutCount).toBe(0);
    });
});