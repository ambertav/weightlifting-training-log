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
let friendId = '';
let friendUsername = '';
let notFriendUsername = '';
let workout = {};
let favorite = {};
let movement = {};

const today = new Date();
today.setUTCHours(0, 0, 0, 0,);

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
    friendUsername = john.username

    const notFriend = await User.create({
        firstName: 'Not Jane\'s Friend',
        username: 'notfriend',
        email: 'notafriend@doe.com',
        password: 'password123',
    });
    notFriendUsername = notFriend.username;

    const friendship = await Request.create({
        from: janeId,
        to: john._id
    });
    friendId = friendship.to

    await Movement.create(movementData.slice(0, 5));
    movement = await Movement.findOne({}).lean();

    await Favorite.create({
        name: 'johns favorite',
        exercise: [{
            movement: {
                name: 'bicep curls',
                musclesWorked: ['Biceps'],
                type: 'weighted',
            },
            weight: 25,
            sets: 5,
            reps: 5
        }],
        createdBy: john._id
    });

    await testSession
        .post('/login')
        .send({ email: 'jane@doe.com', password: 'password123' });


    await testSession
        .post('/workouts')
        .send({
            day: today,
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

describe('GET /users/:username/favorites', () => {
    test('should render public favorites for other user', async () => {
        const favorites = await Favorite.find({ createdBy: friendId, isPublic: true });
        const response = await testSession
            .get(`/users/${friendUsername}/favorites`)
            .expect(200);
        
        expect(response.text).toContain(`${friendUsername}\'s Favorite Workouts`);
        for (const favorite of favorites) {
            expect(response.text).toContain(`${favorite.name}`);
        }
    });

    test('should handle error for invalid username', async () => {
        const response = await testSession
            .get(`/users/invalidUsername/favorites`)
            .expect(404);
        
        expect(response.body.error).toEqual('User not found');
    });

    test('should handle error if requesting user is not other user\'s friend', async () => {
        const response = await testSession
            .get(`/users/${notFriendUsername}/favorites`)
            .expect(404);
        
        expect(response.body.error).toEqual('Cannot view this user\'s favorites');
    });
});


// tests for non-GET methods
describe('POST /workouts/:id/favorite', () => {
    test('should successfully create a favorite', async () => {
        const response = await testSession
            .post(`/workouts/${workout._id}/favorite`)
            .send({ name: 'favorite workout' })
            .expect(200)
        
        expect(response.text).toContain(`${workout.formattedDay}`);
        expect(response.text).toContain('Favorite added!');

        const createdFavorite = await Favorite.findOne({ name: 'favorite workout', createdBy: janeId });
        expect(createdFavorite).toBeDefined();
    });

    test('should handle error if invalid workout input', async () => {
        const id = new mongoose.Types.ObjectId();
        const response = await testSession
            .post(`/workouts/${id}/favorite`)
            .send({ name: 'invalid favorite' })
            .expect(404)

        expect(response.body.error).toEqual('Workout not found');

        const createdFavorite = await Favorite.findOne({ name: 'invalid favorite', createdBy: janeId });
        expect(createdFavorite).toBeNull();
    });
});

describe('POST /favorites/:id/copy', () => {
    test('should copy a favorite to create a workout', async () => {
        const date = new Date(today);
        date.setDate(today.getDate() + 15);

        const response = await testSession
            .post(`/favorites/${favorite._id}/copy`)
            .send({ day: date })
            .expect(302)

        expect(response.header.location).toBe('/workouts');

        const createdWorkout = await Workout.findOne({ day: date, createdBy: janeId })
            .populate('exercise.movement');
        expect(createdWorkout).toBeDefined();

        expect(createdWorkout).toMatchObject({
            day: date,
            exercise: [{
                movement: expect.objectContaining({
                    name: favorite.exercise[0].movement.name,
                    musclesWorked: favorite.exercise[0].movement.musclesWorked,
                    type: favorite.exercise[0].movement.type
                }),
                weight: favorite.exercise[0].weight,
                sets: favorite.exercise[0].sets,
                reps: favorite.exercise[0].reps,
            }],
            createdBy: favorite.createdBy
        });
    });

    test('should create the necessary movements within favorite for user', async () => {
        const date = new Date(today);
        date.setDate(today.getDate() + 15);

        await Movement.deleteOne({ _id: movement._id });

        const response = await testSession
            .post(`/favorites/${favorite._id}/copy`)
            .send({ day: date })
            .expect(302);

        expect(response.header.location).toBe('/workouts');

        const createdWorkout = await Workout.findOne({ day: date, createdBy: janeId })
            .populate('exercise.movement');
        expect(createdWorkout).toBeDefined();

        const createdMovement = await Movement.findById(createdWorkout.exercise[0].movement);
        expect(createdMovement).toBeDefined();
        expect(createdMovement).toMatchObject({
            ...favorite.exercise[0].movement
        });
    });

    test('should handle error if invalid favorite input', async () => {
        const date = new Date(today);
        date.setDate(today.getDate() + 15);

        const invalidId = new mongoose.Types.ObjectId();

        const response = await testSession
            .post(`/favorites/${invalidId}/copy`)
            .send({ day: date })
            .expect(404)

        expect(response.body.error).toEqual('Favorite not found');
        
        const invalidWorkout = await Workout.findOne({ day: date, createdBy: janeId });
        expect(invalidWorkout).toBeNull();
    });
});

describe('POST /favorites/:id/share', () => {
    test('should successfully share a favorite', async () => {
        const response = await testSession
            .post(`/favorites/${favorite._id}/share`)
            .send({ friend: friendId })
            .expect(302)

        expect(response.header.location).toBe('/favorites');

        const sharedFavorite = await Favorite.findOne({ name: favorite.name, createdBy: janeId });
        expect(sharedFavorite).toBeDefined();
        expect(sharedFavorite.exercise[0]).toMatchObject({
            movement: favorite.exercise[0].movement,
            weight: favorite.exercise[0].weight,
            sets: favorite.exercise[0].sets,
            reps: favorite.exercise[0].reps,
        });
    });
    
    test('should handle error if invalid favorite', async () => {
        const id = new mongoose.Types.ObjectId();

        const response = await testSession
            .post(`/favorites/${id}/share`)
            .send({ friend: friendId })
            .expect(404)
        
        expect(response.body.error).toEqual('Favorite not found');
    });

    test('should handle error if invalid friendship', async () => {
        const id = new mongoose.Types.ObjectId();

        const response = await testSession
            .post(`/favorites/${favorite._id}/share`)
            .send({ friend: id })
            .expect(403)
    
        expect(response.body.error).toEqual('Favorites can only be shared between friends');
    });
});

describe('DELETE /favorites/:id', () => {
    test('should successfully delete a favorite', async () => {
        const response = await testSession 
            .delete(`/favorites/${favorite._id}`)
            .expect(302)

        expect(response.header.location).toBe('/favorites');

        const deletedFavorite = await Favorite.findById(favorite._id);
        expect(deletedFavorite).toBeNull();
    });

    test('should handle error if invalid input', async () => {
        const id = new mongoose.Types.ObjectId();

        const response = await testSession 
            .delete(`/favorites/${id}`)
            .expect(404)

        expect(response.body.error).toEqual('Favorite not found, could not delete');
    });
});

describe('PUT /favorites/:id/toggle-public', () => {
    test('should successfully toggle the isPublic attribute', async () => {
        const favorite = await Favorite.findOne({ createdBy: janeId });

        const response = await testSession
            .put(`/favorites/${favorite._id}/toggle-public`)
            .expect(200);
        

        expect(response.body.message).toEqual('Favorite updated successfully');

        const updatedFavorite = await Favorite.findById(favorite._id);
        expect(updatedFavorite.isPublic).toBe(!favorite.isPublic);
    });

    test('should handle error if invalid favorite', async () => {
        const invalidId = new mongoose.Types.ObjectId();

        const response = await testSession
            .put(`/favorites/${invalidId}/toggle-public`)
            .expect(404);
        
        expect(response.body.error).toEqual('Favorite not found');
    });
});