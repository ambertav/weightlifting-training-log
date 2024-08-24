import mongoose from 'mongoose';

import User, { UserDocument } from '../../models/user';
import Favorite, { FavoriteDocument } from '../../models/favorite';
import { expectValidationError } from '../testUtilities';

import movementData from '../../seed/movementData';
import { MovementDocument } from '../../models/movement';

require('dotenv').config();

// global variables used for referenced documents throughout tests
let userId = '';
let weightedMovement : Partial<MovementDocument>;
let cardioMovement : Partial<MovementDocument>;

interface FavoriteData {
    name : string; 
    createdBy : string;
    exercise : {
        movement : Partial<MovementDocument>;
        weight? : number;
        reps? : number;
        sets? : number;
        distance? : number;
        minutes? : number;
        caloriesBurned? : number;
    }[];
}

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL!);
    await User.deleteMany({});
    await Favorite.deleteMany({});

    const user = await User.create({
        firstName: 'Jane',
        username: 'jane_doe',
        email: 'jane@example.com',
        password: 'password'
    });
    userId = user._id;

    // assign a weighted and cardio movement for repeated use (imported from seed/movementData.js for ease)
    weightedMovement = movementData[0];
    cardioMovement = movementData[movementData.length - 1];

    // delete fields that are not present on favorite.movement
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
        console.log(weightedMovement);
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

        // checks that favorite was created and contains the input's data
        expect(favorite).toBeDefined();
        expect(favorite).toMatchObject(validFavoriteData);
        expect(favorite.exercise[0].movement).toMatchObject(validFavoriteData.exercise[0].movement);
    });


    test('should throw validation error when required fields are missing', async () => {
        const invalidFavoriteData = {}
        const error = await expectValidationError(Favorite, invalidFavoriteData);

        // verifies that error for each missing required field is present
        ['name', 'exercise', 'createdBy'].forEach(field => {
            expect(error.errors[field]).toBeDefined();
        });
    });

    test('should throw validation error when data violates minimum value field requirements', async () => {
        const favoriteMinViolation = {
            name: 'favorite',
            exercise: [{
                movement: weightedMovement,
                weight: -1,
                sets: 0,
                reps: 0,
                distance: 0,
                minutes: 0,
                caloriesBurned: 0,
            }],
            createdBy: userId,

        }

        const error = await expectValidationError(Favorite, favoriteMinViolation);

        // ensures that error for each minimum value violation is present
        ['weight', 'sets', 'reps', 'minutes', 'caloriesBurned'].forEach(field => {
            expect(error.errors[`exercise.0.${field}`]).toBeDefined();
        });
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

        // ensures that error for each max length violation is present
        expect(error.errors.name).toBeDefined();
        expect(error.errors['exercise.0.movement.name']).toBeDefined();
    });

    test('should allow population of referenced model instances', async () => {
        const favorite : FavoriteDocument | null = await Favorite.findOne()
            .populate('createdBy')
        
        expect(favorite).not.toBeNull();

        // checks that the field populated and exists
        expect((favorite!.createdBy as UserDocument).username).toBeDefined();
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

        // verifies enum on movement type
        expect(error.errors['exercise.0.movement.type']).toBeDefined();
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

        // ensures that favorite wasn't created with invalid user
        expect(error.errors.createdBy).toBeDefined();
    });
});


describe('Favorite model\'s required exercise fields schema middleware', () => {
    const baseFavoriteData = {} as FavoriteData

    beforeEach(async () => {
        await Favorite.deleteMany({});

        baseFavoriteData.name = 'favorite';
        baseFavoriteData.createdBy = userId;
    });

    // reuseable function for attempt to create, and verifying the message rationale
    async function expectCreationError (favoriteData : FavoriteData, errorMessage : string) {
        try {
            await Favorite.create(favoriteData);
            // fail if success
            fail('Expected an error but did not receive one');
        } catch (error) {
            if (error instanceof mongoose.Error.ValidationError)
                // verifies exercise middleware's error message
                expect(error.message).toContain(errorMessage);

            else throw error;
        }

        // ensures that favorite was not saved in database
        const favoriteCount = await Favorite.countDocuments({});
        expect(favoriteCount).toBe(0);
    }

    test('should throw error when cardio type movement exercises are missing required cardio fields', async () => {
        const cardioFavoriteMissingFields = {
            ...baseFavoriteData,
            exercise: [{ movement: cardioMovement }]
        }

        await expectCreationError(cardioFavoriteMissingFields, 'Cardio exercises require distance, minutes, and calories burned');
    });

    test('should throw error when cardio type movement exercises have weighted fields', async () => {
        const cardioFavoriteWrongFields = {
            ...baseFavoriteData,
            exercise: [{
                movement: cardioMovement,
                weight: 100,
                sets: 1,
                reps: 1,
                distance: 1,
                minutes: 1,
                caloriesBurned: 1
            }]
        }

        await expectCreationError(cardioFavoriteWrongFields, 'Cardio exercises cannot have weight, sets, or reps');
    });

    test('should throw error when weighted type movement exercises are missing required weighted fields', async () => {
        const weightedFavoriteMissingFields = {
            ...baseFavoriteData,
            exercise: [{ movement: weightedMovement }]
        }

        await expectCreationError(weightedFavoriteMissingFields, 'Weighted exercises require weight, sets, and reps');
    });

    test('should throw error when weighted type movement exercises have cardio fields', async () => {
        const weightedFavoriteWrongFields = {
            ...baseFavoriteData,
            exercise: [{
                movement: weightedMovement,
                weight: 100,
                sets: 1,
                reps: 1,
                distance: 1,
                minutes: 1,
                caloriesBurned: 1,
            }]
        }

        await expectCreationError(weightedFavoriteWrongFields, 'Weighted exercises cannot have distance, minutes, or calories burned');
    });
});