import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../server';

import User from '../../models/user';
import FriendRequest, { FriendRequestDocument } from '../../models/friend-request';

require('dotenv').config();

let cookie : string;

let janeId = '';
let johnId = '';

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL!);
    await User.deleteMany({});
    await FriendRequest.deleteMany({});

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

    const loginResponse = await request(app)
        .post('/login')
        .send({ email: 'jane@doe.com', password: 'password123' });
    
    cookie = loginResponse.headers['set-cookie'][0];

});

afterAll(async () => {
    await mongoose.connection.close();
});


describe('POST /users/request', () => {
    test('should successfully create a request', async () => {
        const requestData = {
            from: janeId,
            to: johnId
        }

        const response = await request(app)
            .post('/users/request')
            .set('Cookie', cookie)
            .send(requestData)
            .expect(302);

        expect(response.header.location).toBe('/users/me');

        const createdRequest = await FriendRequest.findOne(requestData);
        expect(createdRequest).toBeDefined();
        expect(createdRequest).toMatchObject(requestData);
    });

    test('should send error if existing request', async () => {

        const response = await request(app)
            .post('/users/request')
            .set('Cookie', cookie)
            .send({
                from: janeId,
                to: johnId
            })
            .expect(409)

            expect(response.body.error).toEqual('Duplicate request');
    });

    test('should handle error if one or more invalid users', async () => {
        const response = await request(app)
            .post('/users/request')
            .set('Cookie', cookie)
            .send({
                from: 'invalidOne',
                to: 'invalidTwo'
            })
            .expect(400)

            expect(response.body.error).toEqual('Requests can only be made between valid users');
    });
});

describe('PUT /users/request/edit', () => {
    let friendRequest = {} as FriendRequestDocument;

    beforeEach(async () => {
        await FriendRequest.deleteMany({});
        friendRequest = await FriendRequest.create({
            from: johnId,
            to: janeId
        });
    });

    test('should successfully update the request if accepted', async () => {
        const response = await request(app)
            .put('/users/request/edit')
            .set('Cookie', cookie)
            .send({
                requestId: friendRequest._id,
                decision: 'Accept'
            })
            .expect(302)

            expect(response.header.location).toBe('/users/me');

            const updatedRequest : FriendRequestDocument | null = await FriendRequest.findById(friendRequest._id);
            expect(updatedRequest).not.toBeNull();
            expect(updatedRequest!.status).toEqual('accepted');
    });

    test('should throw error if invalid decision is included', async () => {
        const response = await request(app)
            .put('/users/request/edit')
            .set('Cookie', cookie)
            .send({
                requestId: friendRequest._id,
                decision: 'invalid'
            })
            .expect(400)

            expect(response.body.error).toEqual('Invalid decision for status update');
    });

    test('should delete a declined request', async () => {
        const response = await request(app)
            .put('/users/request/edit')
            .set('Cookie', cookie)
            .send({
                requestId: friendRequest._id,
                decision: 'Decline'
            })
            .expect(302)

            expect(response.header.location).toBe('/users/me');

            const deletedRequest = await FriendRequest.findById(friendRequest._id);
            expect(deletedRequest).toBeNull();

    });

    test('should handle error if request is not found', async () => {
        const response = await request(app)
            .put('/users/request/edit')
            .set('Cookie', cookie)
            .send({
                requestId: new mongoose.Types.ObjectId(),
                decision: 'Accept'
            })
            .expect(404);

            expect(response.body.error).toEqual('Friend request not found');
    });
});