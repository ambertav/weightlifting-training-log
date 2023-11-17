const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('../../models/user');
const { expectValidationError } = require('../testUtilities');

require('dotenv').config();

// global declaration for use across tests
const notHashedPassword = 'password123';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({});
});

afterAll(async () => {
    await mongoose.connection.close();
});


describe('User Model', () => {
    test('should successfully create a user with valid data', async () => {
        const validUserData = {
            firstName: 'Jane',
            username: 'jane_doe',
            email: 'jane@example.com',
            password: notHashedPassword
        }

        const user = await User.create(validUserData);

        expect(user).toBeDefined();
        expect(user.firstName).toBe(validUserData.firstName);
        expect(user.username).toBe(validUserData.username);
        expect(user.email).toBe(validUserData.email);

    });

    test('should hash password before saving user instance', async () => {
        const user = await User.findOne({ email: 'jane@example.com' });
        expect(user).toBeDefined();

        // ensuring that password saved isn't equal to unhashed password
        expect(user.password).not.toBe(notHashedPassword);

        // ensuring that password is valid bcrypt hash of the not hashed password
        const isPasswordValid = await bcrypt.compare(notHashedPassword, user.password);
        expect(isPasswordValid).toBe(true);
    });

    test('should throw mongoose validation error when required fields are missing', async () => {
        const userWithMissingFields = {};
        const error = await expectValidationError(User, userWithMissingFields);

        // ensuring that errors for each required field violation is included

        ['firstName', 'username', 'email', 'password'].forEach(field => {
            expect(error.errors[field]).toBeDefined();
        });

        // final assurance that the error message confirms failure
        expect(error._message).toEqual('User validation failed');
    });

    test('should throw mongoose validation error for violation of maxLength', async () => {
        const userDataWithTooLongFields = {
            firstName: 'a'.repeat(31),
            username: 'b'.repeat(31),
            email: 'jane@example.com',
            password: 'password',
            bio: 'c'.repeat(101)
        }

        const error = await expectValidationError(User, userDataWithTooLongFields);

        // ensuring that errors for each maxLength violation is included
        ['firstName', 'username', 'bio'].forEach(field => {
            expect(error.errors[field]).toBeDefined();
        });

        // final assurance that the error message confirms failure
        expect(error._message).toEqual('User validation failed');
        
    });

    test('should throw MongoDB server error for a duplicate key value on unique fields', async () => {
        const userWithNonUniqueField = {
            firstName: 'CopycatJane',
            username: 'jane_doe',
            email: 'jane@example.com',
            password: 'password'
        }

        // ensuring that the creation is rejected and error is thrown
        await expect(User.create(userWithNonUniqueField)).rejects.toThrow()
            .catch(error => {
                // asserts error details
                expect(error.code).toBe(11000); // checking mongodb duplicate key error (E11000) match
                expect(error.keyPattern).toEqual({ username: 1 }); // checking key pattern matches the field causing error
                expect(error.keyValue).toEqual({ username: 'jane_doe' }); // checking key value matches duplicated value
            });
    });

    test('should remove password when returning JSON', async () => {
        const user = await User.findOne({ email: 'jane@example.com' });
        expect(user).toBeDefined();

        // testing toJSON transform to remove password
        const userJSON = user.toJSON();

        // password should be deleted and thus return undefined
        expect(userJSON.password).toBeUndefined();
    });

    test('should add default value to excluded keys when user is created', async () => {
        const user = await User.findOne({ email: 'jane@example.com' });
        expect(user).toBeDefined();

        // ensuring that default values on fields are being assigned to created user
        expect(user.profilePhoto).toBe('https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png');
        expect(user.bio).toBe('');
    });
});

