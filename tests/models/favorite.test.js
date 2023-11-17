const mongoose = require('mongoose');

const User = require('../../models/user');
const Favorite = require('../../models/favorite');
const { expectValidationError } = require('../testUtilities');
const movementData = require('../../seed/movementData');

require('dotenv').config();

// global variables used for referenced documents throughout tests
let userId = '';
let weightedMovement;
let cardioMovement;

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({});
    await Favorite.deleteMany({});

    const user = await User.create({
        firstName: 'Jane',
        username: 'jane_doe',
        email: 'jane@example.com',
        password: 'password'
    });
    userId = user._id;

    weightedMovement = movementData[0];
    cardioMovement = movementData[movementData.length - 1];
    delete weightedMovement.createdBy;
    delete weightedMovement.description;
    delete cardioMovement.createdBy;
    delete cardioMovement.description;
});

afterAll(async () => {
    await mongoose.connection.close();
});


describe('Favorite model', () => {
    test('should successfully create a favorite with valid data', async () => {
        const validFavoriteData = {
            name: 'favorite',
            exercise: [{
                movement: weightedMovement,
                weight: 100,
                sets: 1,
                reps: 1,
            }],
            createdBy: userId
        }
        const favorite = await Favorite.create(validFavoriteData);

        expect(favorite).toBeDefined();
        expect(favorite.name).toEqual(validFavoriteData.name)
        expect(favorite.exercise[0].movement).toMatchObject(validFavoriteData.exercise[0].movement);
        expect(favorite.createdBy).toEqual(validFavoriteData.createdBy);
    });


    test('should throw validation error when required fields are missing', async () => {
        const invalidFavoriteData = {}
        const error = await expectValidationError(Favorite, invalidFavoriteData);

        expect(error.errors.name).toBeDefined();
        expect(error.errors.exercise).toBeDefined();
        expect(error.errors.createdBy).toBeDefined();

        expect(error._message).toEqual('Favorite validation failed');
    });

    test('should throw validation error when data violates minimum value field requirements', async () => {
        const favoriteMinViolation = {
            name: 'favorite',
            exercise: [{
                movement: weightedMovement,
                weight: -1,
                sets: 0,
                reps: 0,
                minutes: 0,
                caloriesBurned: 0,
            }],
            createdBy: userId,

        }

        const error = await expectValidationError(Favorite, favoriteMinViolation);

        expect(error.errors['exercise.0.weight']).toBeDefined();
        expect(error.errors['exercise.0.sets']).toBeDefined();
        expect(error.errors['exercise.0.reps']).toBeDefined();
        expect(error.errors['exercise.0.minutes']).toBeDefined();
        expect(error.errors['exercise.0.caloriesBurned']).toBeDefined();

        expect(error._message).toEqual('Favorite validation failed');
    });

    test('should throw validation error when data violates max length requirements', async () => {
        const favoriteWithTooLongData = {
            name: 'a'.repeat(31),
            exercise: [{
                movement: {
                    name: 'b'.repeat(31),
                    musclesWorked: ['Quadriceps'],
                    type: 'weighted'
                },
                weight: 100,
                sets: 1,
                reps: 1
            }],
            createdBy: userId,
        }

        const error = await expectValidationError(Favorite, favoriteWithTooLongData);

        expect(error.errors.name).toBeDefined();
        expect(error.errors['exercise.0.movement.name']).toBeDefined();

        expect(error._message).toEqual('Favorite validation failed');
    });

    test('should allow population of referenced model instances', async () => {
        const favorite = await Favorite.findOne()
            .populate('createdBy')

        expect(favorite.createdBy.username).toBeDefined();
    });

    test('should throw error when invalid movement type enum', async () => {
        const favoriteWithInvalidMovementType = {
            name: 'favorite',
            exercise: [{
                movement: {
                    name: 'movement',
                    musclesWorked: ['Quadriceps'],
                    type: 'invalid'
                },
                weight: 100,
                sets: 1,
                reps: 1
            }],
            createdBy: userId,
        }

        const error = await expectValidationError(Favorite, favoriteWithInvalidMovementType);

        expect(error.errors['exercise.0.movement.type']).toBeDefined();
        expect(error._message).toEqual('Favorite validation failed');
    });

    test('should throw error when invalid user is referenced', async () => {
        const favoriteWithInvalidUser = {
            name: 'favorite',
            exercise: [{
                movement: weightedMovement,
                weight: 100,
                sets: 1,
                reps: 1,
            }],
            createdBy: 'invalid'
        }

        const error = await expectValidationError(Favorite, favoriteWithInvalidUser);

        expect(error.errors.createdBy).toBeDefined();
        expect(error._message).toEqual('Favorite validation failed');
    });
});


describe('Favorite model\'s required exercise fields schema middleware', () => {
    const baseFavoriteData = {};

    beforeEach(async () => {
        await Favorite.deleteMany({});

        baseFavoriteData.name = 'favorite';
        baseFavoriteData.createdBy = userId;
    });

    test('should throw error when cardio type movement exercises are missing required cardio fields', async () => {
        const cardioFavoriteMissingFields = {
            ...baseFavoriteData,
            exercise: [{
                movement: cardioMovement,
            }]
        }

        try {
            await Favorite.create(cardioFavoriteMissingFields);
            fail('Expected an error but did not receive one');
        } catch (error) {
            expect(error.message).toBe('Cardio exercises require minutes and calories burned');
        }

        const favoriteCount = await Favorite.countDocuments({});
        expect(favoriteCount).toBe(0);
    });

    test('should throw error when cardio type movement exercises have weighted fields', async () => {
        const cardioFavoriteWrongFields = {
            ...baseFavoriteData,
            exercise: [{
                movement: cardioMovement,
                weight: 100,
                sets: 1,
                reps: 1,
                minutes: 1,
                caloriesBurned: 1
            }]
        }

        try {
            await Favorite.create(cardioFavoriteWrongFields);
            fail('Expected an error but did not receive one');
        } catch (error) {
            expect(error.message).toBe('Cardio exercises cannot have weight, sets, or reps');
        }

        const favoriteCount = await Favorite.countDocuments({});
        expect(favoriteCount).toBe(0);
    });

    test('should throw error when weighted type movement exercises are missing required weighted fields', async () => {
        const weightedFavoriteMissingFields = {
            ...baseFavoriteData,
            exercise: [{
                movement: weightedMovement,
            }]
        }

        try {
            await Favorite.create(weightedFavoriteMissingFields);
            // fail if success
            fail('Expected an error but did not receive one');
        } catch (error) {
            // verifies middleware's error message
            expect(error.message).toBe('Weighted exercises require weight, sets, and reps');
        }


        const favoriteCount = await Favorite.countDocuments({});
        expect(favoriteCount).toBe(0);
    });

    test('should throw error when weighted type movement exercises have cardio fields', async () => {
        const weightedFavoriteWrongFields = {
            ...baseFavoriteData,
            exercise: [{
                movement: weightedMovement,
                weight: 100,
                sets: 1,
                reps: 1,
                minutes: 1,
                caloriesBurned: 1,
            }]
        }

        try {
            await Favorite.create(weightedFavoriteWrongFields);
            // fail if success
            fail('Expected an error but did not receive one');
        } catch (error) {
            // verifies middleware's error message
            expect(error.message).toBe('Weighted exercises cannot have minutes and calories burned');
        }

        const favoriteCount = await Favorite.countDocuments({});
        expect(favoriteCount).toBe(0);
    });


});