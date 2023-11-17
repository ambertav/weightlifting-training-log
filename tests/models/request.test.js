const mongoose = require('mongoose');

const Request = require('../../models/request');
const User = require('../../models/user');
const { expectValidationError } = require('../testUtilities');

require('dotenv').config();

let janeId = '';
let johnId = '';

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
    janeId = userJane._id;

    const userJohn = await User.create({
        firstName: 'John',
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password'
    });
    johnId = userJohn._id;

});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('Request Model', () => {
    test('should successfully create a request with valid data', async () => {

        const request = await Request.create({
            from: janeId,
            to: johnId,
        });

        expect(request).toBeDefined();
        expect(request.from._id).toEqual(janeId);
        expect(request.to._id).toEqual(johnId);
    });

    test('should default request to a status of pending', async () => {
        const request = await Request.findOne({ from: janeId });

        expect(request.status).toBeDefined();
        expect(request.status).toEqual('pending');
    });

    test('should throw mongoose error for invalid user', async () => {
        const invalidUserId = 'invalidID';

        const error = await expectValidationError(Request, {
            from: janeId,
            to: invalidUserId,
        });

        expect(error.errors.to).toBeDefined();
        expect(error._message).toEqual('Request validation failed');
    });

    test('should throw mongoose error for invalid enum value', async () => {

        const invalidRequestStatus = {
            from: janeId,
            to: johnId,
            status: 'invalid'
        }
    
        const error = await expectValidationError(Request, invalidRequestStatus);

        expect(error.errors.status).toBeDefined();
        expect(error._message).toEqual('Request validation failed');
    });

    test('should allow population of referenced model instances', async () => {
        const request = await Request.findOne({ from: janeId })
            .populate('to from');

        expect(request.from.username).toBeDefined();
        expect(request.to.username).toBeDefined();
    });
});