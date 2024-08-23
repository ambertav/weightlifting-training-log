const mongoose = require('mongoose');

const Movement = require('../../models/movement');
const User = require('../../models/user');
const Workout = require('../../models/workout');
const { expectValidationError } = require('../testUtilities');
const movementData = require('../../seed/movementData');

require('dotenv').config();

let userId = '';

const today = new Date();
today.setUTCHours(0, 0, 0, 0,);

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({});
    await Movement.deleteMany({});

    const user = await User.create({
        firstName: 'Jane',
        username: 'jane_doe',
        email: 'jane@example.com',
        password: 'password'
    });
    userId = user._id;
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Movement model', () => {
    test('should successfully create a weighted movement with valid data', async () => {

        const validMovementData = {
            name: 'Back Squat',
            description: 'a barbell squat',
            musclesWorked: ['Quadriceps', 'Hamstrings', 'Glutes', 'Lower Back'],
            type: 'weighted',
            createdBy: userId,
        }

        const movement = await Movement.create(validMovementData);

        // ensures that movement was created
        expect(movement).toBeDefined();

        // ensures that created movement has the input's data
        expect(movement).toMatchObject(validMovementData);
    });

    test('should successfully create a cardio movement with valid data', async () => {

        const validMovementData = {
            name: 'Biking',
            description: 'mountain biking through hills',
            type: 'cardio',
            createdBy: userId,
        }

        const movement = await Movement.create(validMovementData);

        // ensures that movement was created
        expect(movement).toBeDefined();

        // ensures that created movement has the input's data
        expect(movement).toMatchObject(validMovementData);
    });

    test('should throw mongoose validation error when required fields are missing', async () => {
        const movementWithMissingFields = {}
        const error = await expectValidationError(Movement, movementWithMissingFields);

        // ensures that errors for each required field violation is included
        ['name', 'type'].forEach(field => {
            expect(error.errors[field]).toBeDefined();
        });

        // final assurance that the error message confirms failure
        expect(error._message).toEqual('Movement validation failed');
    });

    test('should throw mongoose validation error for violation of maxLength', async () => {
        const movementWithTooLongFields = {
            name: 'a'.repeat(31),
            description: 'b'.repeat(101),
            musclesWorked: ['Quadriceps', 'Hamstrings', 'Glutes', 'Lower Back'],
            type: 'weighted',
        }

        const error = await expectValidationError(Movement, movementWithTooLongFields);

        // ensures that errors for each maxLength violation is included
        expect(error.errors.name).toBeDefined();
        expect(error.errors.description).toBeDefined();
        
        // final assurance that the error message confirms failure
        expect(error._message).toEqual('Movement validation failed');
    });

    test('should throw mongoose validation error for invalid movement type', async () => {
        const movementWithInvalidType = {
            name: 'Back Squat',
            description: 'a barbell squat',
            musclesWorked: ['Quadriceps', 'Hamstrings', 'Glutes', 'Lower Back'],
            type: 'invalid',
        }

        const error = await expectValidationError(Movement, movementWithInvalidType);

        // ensures that errors for each invalid enum type is included
        expect(error.errors.type).toBeDefined();
        
        // final assurance that the error message confirms failure
        expect(error._message).toEqual('Movement validation failed');
    });
});


describe('Movement model\'s remove middleware', () => {
    test('should correctly remove associated exercises within workouts upon deletion', async () => {
        const squat = await Movement.findOne({ name: 'Back Squat' });
        const deadlift = await Movement.create(movementData[4]);

        // ensuring that necessary instances are created successfully
        expect(squat).toBeDefined();
        expect(deadlift).toBeDefined();

        // creates workout with exercises containing the movement that will be deleted, and one movement that won't be
        const workoutToBeModified = await Workout.create({
            day: today,
            exercise: [
                {
                    movement: squat._id,
                    weight: 100,
                    sets: 1,
                    reps: 1,
                },
                {
                    movement: deadlift._id,
                    weight: 100,
                    sets: 1,
                    reps: 1,
                }
            ],
            createdBy: userId,
        });

        // creates a workout with only one exercise, containing the movement that will be deleted
        const workoutToBeDeleted = await Workout.create({
            day: today,
            exercise: [
                {
                    movement: deadlift._id,
                    weight: 100,
                    sets: 1,
                    reps: 1,
                }
            ],
            createdBy: userId,
        });

        // ensures that the workouts were created successfully
        expect(workoutToBeModified).toBeDefined();
        expect(workoutToBeDeleted).toBeDefined();

        // invokes the remove method to delete the movement and call remove middleware
        await deadlift.deleteOne();

        // ensures that the movement was deleted
        const deletedMovement = await Movement.findById(deadlift._id);
        expect(deletedMovement).toBeNull();

        // ensures that the workout with the exercise containing the deleted movement, was deleted
        const deletedWorkout = await Workout.findById(workoutToBeDeleted._id);
        expect(deletedWorkout).toBeNull();

        // ensures that the workout with two exercises was modified to now only include the movement that wasn't deleted
        const modifiedWorkout = await Workout.findById(workoutToBeModified._id);
        expect(modifiedWorkout.exercise.length).toBe(1); // should be 1 exercise
        expect(modifiedWorkout.exercise.movement).not.toEqual(deadlift._id); // the exercise.movement shouldn't be the deleted movement
    });
});