import mongoose from 'mongoose';

import FriendRequest, { FriendRequestDocument } from '../../models/friend-request';
import User, { UserDocument } from '../../models/user';
import { expectValidationError } from '../testUtilities';

require('dotenv').config();

let janeId = '';
let johnId = '';

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URL!);
    await User.deleteMany({});
    await FriendRequest.deleteMany({});

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

        const request : FriendRequestDocument = await FriendRequest.create({
            from: janeId,
            to: johnId,
        });

        expect(request).toBeDefined();
        expect(request.from._id).toEqual(janeId);
        expect(request.to._id).toEqual(johnId);
    });

    test('should default request to a status of pending', async () => {
        const request : FriendRequestDocument | null = await FriendRequest.findOne({ from: janeId });

        expect(request).not.toBeNull();

        expect(request!.status).toBeDefined();
        expect(request!.status).toEqual('pending');
    });

    test('should throw mongoose error for invalid user', async () => {
        const invalidUserId = 'invalidID';

        const error = await expectValidationError(FriendRequest, {
            from: janeId,
            to: invalidUserId,
        });

        expect(error.errors.to).toBeDefined();
    });

    test('should throw mongoose error for invalid enum value', async () => {

        const invalidRequestStatus = {
            from: janeId,
            to: johnId,
            status: 'invalid'
        }
    
        const error = await expectValidationError(FriendRequest, invalidRequestStatus);

        expect(error.errors.status).toBeDefined();
    });

    test('should allow population of referenced model instances', async () => {
        const request : FriendRequestDocument | null = await FriendRequest.findOne({ from: janeId })
            .populate('to from');
        
        expect(request).not.toBeNull();

        expect((request!.from as UserDocument).username).toBeDefined();
        expect((request!.to as UserDocument).username).toBeDefined();
    });
});