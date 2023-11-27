const mongoose = require('mongoose');
const request = require('supertest');
const session = require('supertest-session');
const cheerio = require('cheerio');
const app = require('../../server');

const User = require('../../models/user');
const Request = require('../../models/request');
const Workout = require('../../models/workout');
const Movement = require('../../models/movement');

const movementData = require('../../seed/movementData');

require('dotenv').config();

const testSession = session(app);

let janeId = '';
let johnId = '';
let weightedMovement = {};
let cardioMovement = {};
let friendship = {};

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({});
    await Request.deleteMany({});
    await Workout.deleteMany({});
    await Movement.deleteMany({});

    await Movement.create(movementData.slice(0, 5));
    weightedMovement = await Movement.findOne({});

    cardioMovement = await Movement.create(movementData[movementData.length - 1]);

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

    friendship = await Request.create({
        from: janeId,
        to: johnId,
        status: 'accepted'
    });

    await friendship.populate({ path: 'to', select: 'username' })

    await testSession
        .post('/login')
        .send({ email: 'jane@doe.com', password: 'password123' });

    
    const weightedWorkoutData = {
        day: 'Monday',
        exercise: [{ 
            movement: weightedMovement._id,
            weight: 100,
            sets: 1,
            reps: 1,
        }],
    }

    const cardioWorkoutData = {
        day: 'Monday',
        exercise: [{ 
            movement: cardioMovement._id,
            minutes: 50,
            caloriesBurned: 50,
        }],
    }

    await Workout.insertMany([
        {
            createdBy: janeId,
            ...weightedWorkoutData,
        }, {
            createdBy: janeId,
            ...cardioWorkoutData,
        }, {
            createdBy: johnId,
            ...weightedWorkoutData,
        }, {
            createdBy: johnId,
            ...cardioWorkoutData,
        }
    ]);
});

afterAll(async () => {
    testSession.destroy();
    await mongoose.connection.close();
});


// tests for get views
describe('GET /users/me', () => {
    test('should successfully render user\'s profile view', async () => {
        const response = await testSession
            .get('/users/me')
            .expect(200);

        // query for user
        const user = await User.findById(janeId);
        // check that user's profile info is render in view
        expect(response.text).toContain(`Hello, ${user.firstName}!`);
        
        // query for associated weighted and cardio workouts
        const weightedWorkout = await Workout.find({ 
            createdBy: janeId, 'exercise.movement': weightedMovement._id
        }).populate('exercise.movement');

        const cardioWorkout = await Workout.find({
            createdBy: janeId, 'exercise.movement': cardioMovement._id
        }).populate('exercise.movement');

        // loop through each weighted workout
        for (const workout of weightedWorkout) {
            // for ease, assuming only 1 exercise per workout for test
            // then loop through musclesWorked array for exercise
            workout.exercise[0].movement.musclesWorked.forEach((muscle) => {
                // check that the muscles are rendered in the view (veriication for doughnut chart)
                expect(response.text).toContain(`${muscle}`);
            });
        }

        // loop through each cardio workout
        for (const workout of cardioWorkout) {
            // for ease, assuming only 1 exercise per workout for test
            // then check if minutes and caloriesBurned are rendered in view
            expect(response.text).toContain(`${workout.exercise[0].minutes}`);
            expect(response.text).toContain(`${workout.exercise[0].caloriesBurned}`);
        }

        // using cheerio to select parts of DOM
        const $ = cheerio.load(response.text);
        const friendsList = $('#friendsList'); // select friends list
        // checking that accepted request was correctly sorted into friends list 
        expect(friendsList.text()).toContain(`${friendship.to.username}`);
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
        const otherUser = await User.findById(johnId);

        const response = await testSession
            .get(`/users/profile/${otherUser.username}`)
            .expect(200);

        // checking to see if other user's info is present
        expect(response.text).toContain(`${otherUser.username}`);

        // searching for weighted and cardio movements associated with other user
        const weightedWorkout = await Workout.find({ 
            createdBy: johnId, 'exercise.movement': weightedMovement._id
        }).populate('exercise.movement');

        const cardioWorkout = await Workout.find({
            createdBy: johnId, 'exercise.movement': cardioMovement._id
        }).populate('exercise.movement');

        // loop through each weighted workout
        for (const workout of weightedWorkout) {
            // for ease, assuming only 1 exercise per workout for test
            // then loop through musclesWorked array for exercise
            workout.exercise[0].movement.musclesWorked.forEach((muscle) => {
                // check that the muscles are rendered in the view (veriication for doughnut chart)
                expect(response.text).toContain(`${muscle}`);
            });
        }

        // loop through each cardio workout
        for (const workout of cardioWorkout) {
            // for ease, assuming only 1 exercise per workout for test
            // then check if minutes and caloriesBurned are rendered in view
            expect(response.text).toContain(`${workout.exercise[0].minutes}`);
            expect(response.text).toContain(`${workout.exercise[0].caloriesBurned}`);
        }
    });

    test('should redirect user to /user/me if user routes to own page, and render profile', async () => {
        const self = await User.findById(janeId); // search for logged in user

        const response = await testSession
            .get(`/users/profile/${self.username}`)
            .expect(302);

        // checking that user was redirected to url for own profile
        expect(response.header.location).toBe('/users/me');
    });

    test('should handle error if invalid input', async () => {
        // ensuring that the username used for test does not return an actual user
        const count = await User.countDocuments({ username: 'invalid' });
        expect(count).toBe(0);

        const response = await testSession
            .get('/users/profile/invalid') // username is 'invalid'
            .expect(404);

        // checking for error
        expect(response.body.error).toEqual('User not found');
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

// describe('PUT /users/me/photo/edit', () => {
//     test('should update the user\'s photo', async () => {

//     });

//     test('should handle error if invalid input', async () => {

//     });
// });

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