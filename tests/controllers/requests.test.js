const mongoose = require('mongoose');
const request = require('supertest');
const session = require('supertest-session');
const app = require('../../server');

const User = require('../../models/user');
const Request = require('../../models/request');

require('dotenv').config();

const testSession = session(app);

let janeId = '';
let johnId = '';

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({});
    await Request.deleteMany({});

    const jane = await User.create({
        firstName: 'Jane',
        username: 'janedoe',
        email: 'jane@doe.com',
        password: 'password123',
    });
    janeId = jane._id;

    const john = await User.create({
        firstName: 'John',
        username: 'johndoe',
        email: 'john@doe.com',
        password: 'password123',
    });
    johnId = john._id;

    await testSession
        .post('/login')
        .send({ email: 'jane@doe.com', password: 'password123' });
});

afterAll(async () => {
    testSession.destroy();
    await mongoose.connection.close();
});


describe('POST /users/request', () => {
    test('should successfully create a request', async () => {
        const requestData = {
            from: janeId,
            to: johnId
        }

        const response = await testSession
            .post('/users/request')
            .send(requestData)
            .expect(302);

        expect(response.header.location).toBe('/users/me');

        const createdRequest = await Request.findOne(requestData);
        expect(createdRequest).toBeDefined();
        expect(createdRequest).toMatchObject(requestData);
    });

    test('should send error if existing request', async () => {

        const response = await testSession
            .post('/users/request')
            .send({
                from: janeId,
                to: johnId
            })
            .expect(409)

            expect(response.body.error).toEqual('Duplicate request');
    });

    test('should handle error if one or more invalid users', async () => {
        const response = await testSession
            .post('/users/request')
            .send({
                from: 'invalidOne',
                to: 'invalidTwo'
            })
            .expect(400)

            expect(response.body.error).toEqual('Requests can only be made between valid users');
    });
});

describe('PUT /users/request/edit', () => {
    let request = {}

    beforeEach(async () => {
        await Request.deleteMany({});
        request = await Request.create({
            from: johnId,
            to: janeId
        });
    });

    test('should successfully update the request if accepted', async () => {
        const response = await testSession
            .put('/users/request/edit')
            .send({
                requestId: request._id,
                decision: 'Accept'
            })
            .expect(302)

            expect(response.header.location).toBe('/users/me');

            const updatedRequest = await Request.findById(request._id);
            expect(updatedRequest.status).toEqual('accepted');
    });

    test('should throw error if invalid decision is included', async () => {
        const response = await testSession
            .put('/users/request/edit')
            .send({
                requestId: request._id,
                decision: 'invalid'
            })
            .expect(400)

            expect(response.body.error).toEqual('Invalid decision for status update');
    });

    test('should delete a declined request', async () => {
        const response = await testSession
            .put('/users/request/edit')
            .send({
                requestId: request._id,
                decision: 'Decline'
            })
            .expect(302)

            expect(response.header.location).toBe('/users/me');

            const deletedRequest = await Request.findById(request._id);
            expect(deletedRequest).toBeNull();

    });

    test('should handle error if request is not found', async () => {
        const response = await testSession
            .put('/users/request/edit')
            .send({
                requestId: new mongoose.Types.ObjectId(),
                decision: 'Accept'
            })
            .expect(404);

            expect(response.body.error).toEqual('Friend request not found');
    });
});