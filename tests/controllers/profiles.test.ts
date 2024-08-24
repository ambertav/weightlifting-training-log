import mongoose from 'mongoose';
import request from 'supertest';
import { load } from 'cheerio';
import app from '../../server';

import User, { UserDocument } from '../../models/user';
import FriendRequest, { FriendRequestDocument } from '../../models/friend-request';
import Workout from '../../models/workout';
import Movement, { MovementDocument } from '../../models/movement';

import movementData from '../../seed/movementData';

require('dotenv').config();

let cookie : string;

let janeId = '';
let johnId = '';
let weightedMovement = {} as MovementDocument;
let cardioMovement = {} as MovementDocument;
let friendship = {} as FriendRequestDocument;

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL!);
    await User.deleteMany({});
    await FriendRequest.deleteMany({});
    await Workout.deleteMany({});
    await Movement.deleteMany({});

    await Movement.create(movementData.slice(0, 5));
    weightedMovement = await Movement.findOne({}) as MovementDocument;

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

    friendship = await FriendRequest.create({
        from: janeId,
        to: johnId,
        status: 'accepted'
    });

    await friendship.populate({ path: 'to', select: 'username' })

    const loginResponse = await request(app)
        .post('/login')
        .send({ email: 'jane@doe.com', password: 'password123' });
    
    cookie = loginResponse.headers['set-cookie'][0];

    
    const weightedWorkoutData = {
        day: today,
        exercise: [{ 
            movement: weightedMovement._id,
            weight: 100,
            sets: 1,
            reps: 1,
        }],
    }

    const cardioWorkoutData = {
        day: today,
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
    await mongoose.connection.close();
});


// tests for get views
describe('GET /users/me', () => {
    test('should successfully render user\'s profile view', async () => {
        const response = await request(app)
            .get('/users/me')
            .set('Cookie', cookie)
            .expect(200);

        // query for user
        const user : UserDocument | null = await User.findById(janeId);
        expect(user).not.toBeNull();
        // check that user's profile info is render in view
        expect(response.text).toContain(`Hello, ${user!.firstName}!`);
        
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
            (workout.exercise[0].movement as MovementDocument).musclesWorked.forEach((muscle) => {
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
        const $ = load(response.text);
        const friendsList = $('#friendsList'); // select friends list
        // checking that accepted request was correctly sorted into friends list 
        expect(friendsList.text()).toContain(`${(friendship.to as UserDocument).username}`);
    });
});

describe('GET /users/search', () => {
    test('should successfully render search view', async () => {
        const response = await request(app) 
            .get('/users/search')
            .set('Cookie', cookie)
            .expect(200)

        expect(response.text).toContain('Search for Users');
    });
});

describe('GET /users/:username/profile', () => {
    test('should successfully render another user\'s profile view', async () => {
        const otherUser : UserDocument | null = await User.findById(johnId);
        expect(otherUser).not.toBeNull();

        const response = await request(app)
            .get(`/users/${otherUser!.username}/profile`)
            .set('Cookie', cookie)
            .expect(200);

        // checking to see if other user's info is present
        expect(response.text).toContain(`${otherUser!.username}`);

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
            (workout.exercise[0].movement as MovementDocument).musclesWorked.forEach((muscle) => {
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
        const self : UserDocument | null = await User.findById(janeId); // search for logged in user
        expect(self).not.toBeNull();

        const response = await request(app)
            .get(`/users/${self!.username}/profile`)
            .set('Cookie', cookie)
            .expect(302);

        // checking that user was redirected to url for own profile
        expect(response.header.location).toBe('/users/me');
    });

    test('should handle error if invalid input', async () => {
        // ensuring that the username used for test does not return an actual user
        const count = await User.countDocuments({ username: 'invalid' });
        expect(count).toBe(0);

        const response = await request(app)
            .get('/users/invalid/profile') // username is 'invalid'
            .set('Cookie', cookie)
            .expect(404);

        // checking for error
        expect(response.body.error).toEqual('User not found');
    });
});

describe('POST /users/search', () => {
    test('should search for users based on input', async () => {
        const response = await request(app)
            .post('/users/search')
            .set('Cookie', cookie)
            .send({ searchTerm: 'john' })
            .expect(200)

        const searchedUser : UserDocument | null = await User.findById(johnId);
        expect(searchedUser).not.toBeNull();

        expect(response.text).toContain(`${searchedUser!.username}`);
        expect(response.text).toContain(`${searchedUser!.profilePhoto}`);
    });

    test('should not return own user\'s username in results', async () => {
        const response = await request(app)
            .post('/users/search')
            .set('Cookie', cookie)
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

        const response = await request(app)
            .put('/users/me/bio/edit')
            .set('Cookie', cookie)
            .send({ bio })
            .expect(302);

        expect(response.header.location).toBe('/users/me');

        const updatedUser : UserDocument | null = await User.findById(janeId);
        expect(updatedUser).not.toBeNull();
        
        expect(updatedUser!.bio).toEqual(bio);
    });

    test('should handle error if invalid input', async () => {
        const tooLongBio = 'a'.repeat(101);

        const response = await request(app)
            .put('/users/me/bio/edit')
            .set('Cookie', cookie)
            .send({ bio: tooLongBio })
            .expect(500);
        
        expect(response.body.error).toEqual('Error updating user bio');
    });
});