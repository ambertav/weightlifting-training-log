const mongoose = require('mongoose');
const request = require('supertest');
const session = require('supertest-session');
const app = require('../../server');

const User = require('../../models/user');
const Request = require('../../models/request');
const Movement = require('../../models/movement');
const Workout = require('../../models/workout');
const Favorite = require('../../models/favorite');

const movementData = require('../../seed/movementData');

require('dotenv').config();

const testSession = session(app);

let janeId = '';
let requestId = '';
let workout = {};
let favorite = {};

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({});
    await Movement.deleteMany({});
    await Workout.deleteMany({});

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

    const friendship = await Request.create({
        from: janeId,
        to: john._id
    });
    requestId = friendship._id;

    await Movement.create(movementData.slice(0, 5));
    movement = await Movement.findOne({}).lean();

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
    
    workout = await Workout.findOne({ createdBy: janeId });

    await testSession
    .post(`/workouts/${workout._id}/favorite`)
    .send({
        name: 'favorite'
    });

    favorite = await Favorite.findOne({ createdBy: janeId, name: 'favorite' })
});

afterAll(async () => {
    testSession.destroy();
    await mongoose.connection.close();
});


// tests for GET views
describe('GET /favorites', () => {
    test('should render the favorites index view', async () => {
        const response = await testSession
            .get('/favorites')
            .expect(200);

        expect(response.text).toContain('Favorites');
        expect(response.text).toContain(`${favorite.name}`);
    });
});

describe('GET /favorites/:id', () => {
    test('should render the favorite detail view', async () => {
        const response = await testSession
            .get(`/favorites/${favorite._id}`)
            .expect(200);

        expect(response.text).toContain(`${favorite.name}`);
        expect(response.text).toContain(`${favorite.exercise[0].movement.name}`);
        expect(response.text).toContain(`${favorite.exercise[0].weight}`);
        expect(response.text).toContain(`${favorite.exercise[0].sets}`);
        expect(response.text).toContain(`${favorite.exercise[0].reps}`);
    });
});


// tests for non-GET methods
describe('POST /workouts/:id/favorite', () => {

});

describe('POST /favorites/:id/copy', () => {

});

describe('POST /favorites/:id/share', () => {

});

describe('DELETE /favorites/:id', () => {

});