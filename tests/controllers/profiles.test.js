const mongoose = require('mongoose');
const request = require('supertest');
const session = require('supertest-session');
const app = require('../../server');
const { expectValidationError } = require('../testUtilities');

const User = require('../../models/user');
const Request = require('../../models/request');
const Workout = require('../../models/workout');
const Movement = require('../../models/movement');

const movementData = require('../../seed/movementData');

require('dotenv').config();

const testSession = session(app);

let janeId = '';
let johnId = '';

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({});
    await Request.deleteMany({});
    await Workout.deleteMany({});
    await Movement.deleteMany({});

    await Movement.create(movementData.slice(0, 5));
    const movement = await Movement.findOne({});

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

    await testSession
        .post('/workouts')
        .send({
            day: 'Monday',
            exercise: { // req.body structure
                movement: [movement._id],
                weight: ['100'],
                sets: ['1'],
                reps: ['1'],
                minutes: [''],
                caloriesBurned: ['']
            },
        });
});

afterAll(async () => {
    testSession.destroy();
    await mongoose.connection.close();
});


// tests for get views
describe('GET /users/me', () => {
    test('should successfully render user\'s profile view', async () => {

    });
});

describe('GET /users/search', () => {
    test('should successfully render search view', async () => {
        const response = await testSession 
            .get('/users/search')
            .expect(200)

        expect(response.text).toContain('Search for Users');
    });
});

describe('GET /users/profile/:username', () => {
    test('should successfully render another user\'s profile view', async () => {

    });

    test('should redirect user to /user/me if user routes to own page, and render profile', async () => {

    });

    test('should handle error if invalid input', async () => {
    
    });
});

describe('POST /users/search', () => {
    test('should search for users based on input', async () => {
        const response = await testSession
            .post('/users/search')
            .send({ searchTerm: 'john' })
            .expect(200)

        const searchedUser = await User.findById(johnId);
        expect(response.text).toContain(`${searchedUser.username}`);
        expect(response.text).toContain(`${searchedUser.profilePhoto}`);
    });

    test('should not return own user\'s username in results', async () => {
        const response = await testSession
            .post('/users/search')
            .send({ searchTerm: 'janedoe' })
            .expect(200)

        expect(response.text).toContain('No users found, please try again');
    });
});

describe('PUT /users/me/photo/edit', () => {
    test('should update the user\'s photo', async () => {

    });

    test('should handle error if invalid input', async () => {

    });
});

describe('PUT /users/me/bio/edit', () => {
    test('should update the user\'s bio', async () => {
        const bio = 'this is a bio';

        const response = await testSession
            .put('/users/me/bio/edit')
            .send({ bio })
            .expect(302);

        expect(response.header.location).toBe('/users/me');
        const updatedUser = await User.findById(janeId);
        expect(updatedUser.bio).toEqual(bio);
    });

    test('should handle error if invalid input', async () => {
        const tooLongBio = 'a'.repeat(101);

        const response = await testSession
            .put('/users/me/bio/edit')
            .send({ bio: tooLongBio })
            .expect(500);
        
        expect(response.body.error).toEqual('Error updating user bio');
    });
});