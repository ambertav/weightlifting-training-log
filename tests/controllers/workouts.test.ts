import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../server';

import User from '../../models/user';
import Movement, { MovementDocument } from '../../models/movement';
import Workout, { WorkoutDocument } from '../../models/workout';

import movementData from '../../seed/movementData';

require('dotenv').config();

let cookie : string;

let janeId = '';
let movement = {} as MovementDocument;
let userMovement = {} as MovementDocument;
let workout = {} as WorkoutDocument;

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL!);
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

    await Movement.create(movementData.slice(0, 5));
    movement = await Movement.findOne({}).lean() as MovementDocument

    const loginResponse = await request(app)
        .post('/login')
        .send({ email: 'jane@doe.com', password: 'password123' })

    cookie = loginResponse.headers['set-cookie'][0];

    await request(app)
        .post('/movements')
        .set('Cookie', cookie)
        .send({
            name: 'Bicep Movement',
            description: 'a bicep movement',
            musclesWorked: { Biceps: 'on' }, // form checkbox formats req.body in this manner
            type: 'weighted'
        });

    userMovement = await Movement.findOne({ createdBy: janeId }) as MovementDocument

    await request(app)
        .post('/workouts')
        .set('Cookie', cookie)
        .send({
            day: today,
            exercise: { // req.body structure
                movement: [movement._id],
                weight: ['100'],
                sets: ['1'],
                reps: ['1'],
                distance: [''],
                minutes: [''],
                caloriesBurned: ['']
            },
            createdBy: janeId
        });
    
    workout = await Workout.findOne({ createdBy: janeId }) as WorkoutDocument;

});

afterAll(async () => {
    await mongoose.connection.close();
});


describe('GET /workouts', () => {
    test('should render the workouts index view', async () => {
        const response = await request(app)
            .get('/workouts')
            .set('Cookie', cookie)
            .expect(200)
            .expect('Content-Type', /html/);

        // verifying page
        expect(response.text).toContain('Workouts');
        // verifying workout info on page
        expect(response.text).toContain(`${workout.formattedDay}`);
    });
});

describe('GET /workouts/new', () => {
    test('should render the create new workout view', async () => {
        const response = await request(app)
            .get('/workouts/new')
            .set('Cookie', cookie)
            .expect(200)
            .expect('Content-Type', /html/);

        // verifying page
        expect(response.text).toContain('Create Workout');

        // verifying if movement info is available
        expect(response.text).toContain(`${movement.name}`); // default movements
        expect(response.text).toContain(`${userMovement.name}`); // and user created movements
    });
});

describe('GET /workouts/:id/edit', () => {
    test('should render the edit workout view', async () => {
        const response = await request(app)
            .get(`/workouts/${workout._id}/edit`)
            .set('Cookie', cookie)
            .expect(200)
            .expect('Content-Type', /html/);

        // verifying page
        expect(response.text).toContain('Edit Workout');

        // verifying workout info
        expect(response.text).toContain(`${workout.exercise[0].weight}`);
        expect(response.text).toContain(`${workout.exercise[0].sets}`);
        expect(response.text).toContain(`${workout.exercise[0].reps}`);

        // verifying movements are available
        expect(response.text).toContain(`${movement.name}`); // default movements
        expect(response.text).toContain(`${userMovement.name}`); // and user created movements
    });
});

describe('GET /workouts/:id', () => {
    test('should render the workout detail view', async () => {
        const response = await request(app)
            .get(`/workouts/${workout._id}`)
            .set('Cookie', cookie)
            .expect(200)
            .expect('Content-Type', /html/);

        // verifying workout info on page
        expect(response.text).toContain(`${workout.formattedDay}`);
        expect(response.text).toContain(`${movement.name}`);
        expect(response.text).toContain(`${workout.exercise[0].weight}`);
        expect(response.text).toContain(`${workout.exercise[0].sets}`);
        expect(response.text).toContain(`${workout.exercise[0].reps}`);
    });
});

describe('POST /workouts', () => {
    test('should create a new workout', async () => {
        await Workout.deleteMany({}); // clears database 

        const date = new Date(today);
        date.setDate(today.getDate() + 1);

        const validWorkout = {
            day: date,
            exercise: { // req.body structure (same index across arrays in fields belong in same object) -- this input should yield TWO exercise objects
                movement: [movement._id, userMovement._id],
                weight: ['100', '150'],
                sets: ['1', '2'],
                reps: ['1', '2'],
                distance: ['', ''],
                minutes: ['', ''],
                caloriesBurned: ['', '']
            },
            createdBy: janeId
        }

        const response = await request(app)
            .post('/workouts')
            .set('Cookie', cookie)
            .send(validWorkout)
            .expect(302);

        // verifying redirect
        expect(response.header.location).toBe('/workouts');

        // verifying workout count
        const count = await Workout.countDocuments({ createdBy: janeId });
        expect(count).toBe(1);

        // verifying length of exercise array in workout
        const createdWorkout : WorkoutDocument | null = await Workout.findOne({ createdBy: janeId, day: date });
        expect(createdWorkout).not.toBeNull();
        expect(createdWorkout!.exercise.length).toBe(2);
    });

    test('should handle error if invalid input', async () => {
        const invalidWorkout = {}

        const response = await request(app)
            .post('/workouts')
            .set('Cookie', cookie)
            .send(invalidWorkout)
            .expect(500)

        expect(response.body.message).toEqual('An error occurred while creating the workout');
    });
});

describe('PUT /workouts/:id', () => {
    let workoutToUpdate = {} as WorkoutDocument;
    let updateWorkoutData = {};

    const date = new Date(today);
    date.setDate(today.getDate() + 1);

    test('should update a workout', async () => {
        workoutToUpdate = await Workout.findOne({ day: date, createdBy: janeId }) as WorkoutDocument;

        workout = workoutToUpdate._id;
        expect(workoutToUpdate.exercise.length).toBe(2);

        updateWorkoutData = {
            exercise: { // req.body structure (same index across arrays in fields belong in same object) -- this input should yield ONE exercise object
                    movement: [movement._id],
                    weight: ['5000'],
                    sets: ['1'],
                    reps: ['1'],
                    distance: [''],
                    minutes: [''],
                    caloriesBurned: ['']
            },
        }

        const response = await request(app)
            .put(`/workouts/${workoutToUpdate?._id!}`)
            .set('Cookie', cookie)
            .send(updateWorkoutData)
            .expect(302);

        // verifying redirect
        expect(response.header.location).toBe('/workouts');
        
        // checking update workout against input
        const updatedWorkout : WorkoutDocument | null = await Workout.findById(workoutToUpdate._id);
        expect (updatedWorkout).not.toBeNull();

        expect(updatedWorkout!.exercise[0].weight).toEqual(5000);
        expect(updatedWorkout!.exercise[0].movement).toEqual(workoutToUpdate.exercise[0].movement);
        expect(updatedWorkout!.exercise.length).toBe(1);

    });

    test('should handle error if invalid workout', async () => {
        // invalid workout id, but valid input
        const id = new mongoose.Types.ObjectId();

        const response = await request(app)
            .put(`/workouts/${id}`)
            .set('Cookie', cookie)
            .send(updateWorkoutData)
            .expect(404);

        expect(response.body.message).toEqual('Workout not found');
    });

    test('should handle error if invalid data', async () => {
        // valid workout id, but invalid input
        const response = await request(app)
            .put(`/workouts/${workoutToUpdate?._id}`)
            .set('Cookie', cookie)
            .send({})
            .expect(500);

        expect(response.body.message).toEqual('An error occurred while updating the workout');
    });
});

describe('PUT /workouts/:id/complete', () => {
    test('should toggle isComplete field on workout', async () => {
        const workoutToComplete : WorkoutDocument | null = await Workout.findOne({ createdBy: janeId });
        expect(workoutToComplete).not.toBeNull();
        expect(workoutToComplete!.isComplete).toBe(false); // checking isComplete is default: false

        // toggling to true
        const setToTrueResponse = await request(app)
            .put(`/workouts/${workoutToComplete!._id}/complete`)
            .set('Cookie', cookie)
            .expect(200);

        const completedWorkout : WorkoutDocument | null = await Workout.findById(workoutToComplete!._id);
        expect(completedWorkout).not.toBeNull();
        expect(completedWorkout!.isComplete).toBe(true); // verifying update to true


        // toggling to false
        const setToFalseResponse = await request(app)
            .put(`/workouts/${workoutToComplete!._id}/complete`)
            .set('Cookie', cookie)
            .expect(200);

        const notCompleteWorkout : WorkoutDocument | null = await Workout.findById(workoutToComplete!._id);
        expect(notCompleteWorkout).not.toBeNull();
        expect(notCompleteWorkout!.isComplete).toBe(false); // verifying update to false
    });

    test('should handle error if invalid input', async () => {
        const id = new mongoose.Types.ObjectId(); // invalid workout id

        const response = await request(app)
            .put(`/workouts/${id}/complete`)
            .set('Cookie', cookie)
            .expect(404);

        expect(response.body.error).toEqual('Workout not found');
    });
});

describe('DELETE /workouts/:id', () => {
    test('should delete a workout', async () => {
        const workoutToDelete = await Workout.findOne({ createdBy: janeId });
        expect(workoutToDelete).not.toBeNull();

        const response = await request(app)
            .delete(`/workouts/${workoutToDelete!._id}`)
            .set('Cookie', cookie)
            .expect(302);
        
        // verifying delete
        const deletedWorkout = await Workout.findById(workoutToDelete!._id);
        expect(deletedWorkout).toBeNull();
    });

    test('should handle error if invalid workout', async () => {
        const id = new mongoose.Types.ObjectId(); // invalid workout id

        const response = await request(app)
            .delete(`/workouts/${id}`)
            .set('Cookie', cookie)
            .expect(404);
        
        expect(response.body.error).toEqual('Workout not found, could not delete');
    });
});
