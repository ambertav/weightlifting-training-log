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

const today = new Date();
today.setUTCHours(0, 0, 0, 0,);

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
            day: today,
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
        expect(workout).toMatchObject({
            day: validWorkoutData.day,
            createdBy: validWorkoutData.createdBy,
            exercise: [
              {
                movement: expect.objectContaining({
                  _id: validWorkoutData.exercise[0].movement,
                }),
                weight: validWorkoutData.exercise[0].weight,
                sets: validWorkoutData.exercise[0].sets,
                reps: validWorkoutData.exercise[0].reps,
              },
            ],
        });
    });

    test('should throw mongoose validation error when workout required fields are missing', async () => {
        const invalidWorkoutData = {}
        const error = await expectValidationError(Workout, invalidWorkoutData);
        
        // ensures errors for each missing required field are included
        ['day', 'exercise', 'createdBy'].forEach(field => {
            expect(error.errors[field]).toBeDefined();
        });

        // ensures presence of error message
        expect(error._message).toEqual('Workout validation failed');
    });

    test('should throw mongoose validation error when invalid exercise inputs are used', async () => {
        const invalidExerciseData = {
            day: today,
            exercise: [{
                movement: 'invalid',
                weight: -1,
                sets: 0,
                reps: 0,
                distance: 0,
                minutes: -1,
                caloriesBurned: -1,
            }],
            createdBy: userId
        }

        const error = await expectValidationError(Workout, invalidExerciseData);

        // ensures errors for each min value violation are included
        ['weight', 'sets', 'reps', 'distance', 'minutes', 'caloriesBurned'].forEach(field => {
            expect(error.errors[`exercise.0.${field}`]).toBeDefined();
        });

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
            day: today,
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


describe('Workout model\'s day field validation', () => {
    test('should throw an error if the workout day is earlier than today', async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1); // Setting date to yesterday

        const invalidWorkoutData = {
            day: yesterday,
            exercise: [{
                movement: weightedId,
                weight: 100,
                sets: 1,
                reps: 1,
            }],
            createdBy: userId
        };

        const error = await expectValidationError(Workout, invalidWorkoutData);

        expect(error.message).toBe('Workout cannot be before today\'s date or more than 30 days in the future');
    });

    test('should throw an error if the workout day is more than 30 days in the future', async () => {
        const tooFarInFuture = new Date();
        tooFarInFuture.setDate(tooFarInFuture.getDate() + 31); // Setting date to 31 days from now

        const invalidWorkoutData = {
            day: tooFarInFuture,
            exercise: [{
                movement: weightedId,
                weight: 100,
                sets: 1,
                reps: 1,
            }],
            createdBy: userId
        };

        const error = await expectValidationError(Workout, invalidWorkoutData);

        expect(error.message).toBe('Workout cannot be before today\'s date or more than 30 days in the future');
    });
});


describe('Workout model\'s required exercise fields schema middleware', () => {
    // global variable with common workout data to be use accross schema middleware tests
    const baseWorkoutData = {};

    beforeEach(async () => {
        await Workout.deleteMany({}); // clears database to utilize count documents for each test

        // fills out required data
        baseWorkoutData.day = today;
        baseWorkoutData.createdBy = userId;
    });

    // reuseable function for attempt to create, and verifying the message rationale
    async function expectCreationError (workoutData, errorMessage) {
        try {
            await Workout.create(workoutData);
            // fail if success
            fail('Expected an error but did not receive one');
        } catch (error) {
            // verifies exercise middleware's error message
            expect(error.message).toBe(errorMessage);
        }

        // ensures that workout was not saved in database
        const workoutCount = await Workout.countDocuments({});
        expect(workoutCount).toBe(0);
    }
    
    test('should throw error when cardio type movement exercises are missing required cardio fields', async () => {
        const cardioWorkoutMissingFields = {
            ...baseWorkoutData,
            exercise: [{ movement: cardioId }]
        }

        await expectCreationError(cardioWorkoutMissingFields, 'Cardio exercises require distance, minutes, and calories burned');
    });

    test('should throw error when cardio type movement exercises have weighted fields', async () => {
        const cardioWorkoutWrongFields = {
            ...baseWorkoutData,
            exercise: [{
                movement: cardioId,
                weight: 100,
                sets: 1,
                reps: 1,
                distance: 1,
                minutes: 1,
                caloriesBurned: 1,
            }]
        }

        await expectCreationError(cardioWorkoutWrongFields, 'Cardio exercises cannot have weight, sets, or reps');
    });

    test('should throw error when weighted type movement exercises are missing required weighted fields', async () => {
        const weightedWorkoutMissingFields = {
            ...baseWorkoutData,
            exercise: [{ movement: weightedId }]
        }

        await expectCreationError(weightedWorkoutMissingFields, 'Weighted exercises require weight, sets, and reps');
    });

    test('should throw error when weighted type movement exercises have cardio fields', async () => {
        const weightedWorkoutWrongFields = {
            ...baseWorkoutData,
            exercise: [{
                movement: weightedId,
                weight: 100,
                sets: 1,
                reps: 1,
                distance: 1,
                minutes: 1,
                caloriesBurned: 1,
            }]
        }

        await expectCreationError(weightedWorkoutWrongFields, 'Weighted exercises cannot have distance, minutes, or calories burned');
    });
});