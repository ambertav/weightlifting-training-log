const mongoose = require('mongoose');

const Request = require('../../models/request');
const User = require('../../models/user');
const { expectValidationError } = require('../testUtilities');

require('dotenv').config();


beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({});
    await Request.deleteMany({});

    const userJane = await User.create({
        firstName: 'Jane',
        username: 'jane_doe',
        email: 'jane@example.com',
        password: 'password'
    });

    const userJohn = await User.create({
        firstName: 'John',
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password'
    });
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Request Model', () => {
    test('should successfully create a request with valid data', async () => {
        const userJane = await User.findOne({ username: 'jane_doe' });
        const userJohn = await User.findOne({ username: 'john_doe' });

        const request = await Request.create({
            from: userJane._id,
            to: userJohn._id,
        });

        expect(request).toBeDefined();
        expect(request.from._id).toEqual(userJane._id);
        expect(request.to._id).toEqual(userJohn._id);
    });

    test('should default request to a status of pending', async () => {
        const userJane = await User.findOne({ username: 'jane_doe' });
        const request = await Request.findOne({ from: userJane._id });

        expect(request.status).toBeDefined();
        expect(request.status).toEqual('pending');
    });

    test('should throw mongoose error for invalid user', async () => {
        const userJane = await User.findOne({ username: 'jane_doe' });
        const invalidUserId = 'invalidID';

        const error = await expectValidationError(Request, {
            from: userJane._id,
            to: invalidUserId,
        });

        expect(error.errors.to).toBeDefined();
        expect(error._message).toEqual('Request validation failed');
    });

    test('should throw mongoose error for invalid enum value', async () => {
        const userJane = await User.findOne({ username: 'jane_doe' });
        const userJohn = await User.findOne({ username: 'john_doe' });

        const invalidRequestStatus = {
            from: userJane._id,
            to: userJohn._id,
            status: 'invalid'
        }
    
        const error = await expectValidationError(Request, invalidRequestStatus);

        expect(error.errors.status).toBeDefined();
        expect(error._message).toEqual('Request validation failed');
    });

    test('should allow population of referenced model instances', async () => {
        const userJane = await User.findOne({ username: 'jane_doe' });
        const request = await Request.findOne({ from: userJane._id })
            .populate('to from');

        expect(request.from.username).toBeDefined();
        expect(request.to.username).toBeDefined();
    });
});