const mongoose = require('mongoose');
const request = require('supertest');
const session = require('supertest-session');
const app = require('../../server');

const User = require('../../models/user');
const Movement = require('../../models/movement');
const Workout = require('../../models/workout');
const movementData = require('../../seed/movementData');

require('dotenv').config();

const testSession = session(app);

let janeId = '';
let movement = {};
let userMovement = {};
let workout = {};

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

    await Movement.create(movementData.slice(0, 5));
    movement = await Movement.findOne({}).lean();

    await testSession
        .post('/login')
        .send({ email: 'jane@doe.com', password: 'password123' });

    await testSession
        .post('/movements')
        .send({
            name: 'Bicep Movement',
            description: 'a bicep movement',
            musclesWorked: { Biceps: 'on' }, // form checkbox formats req.body in this manner
            type: 'weighted'
        });

    userMovement = await Movement.findOne({ createdBy: janeId });

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
            createdBy: janeId
        });
    
    workout = await Workout.findOne({ createdBy: janeId });

});

afterAll(async () => {
    testSession.destroy();
    await mongoose.connection.close();
});


describe('GET /workouts', () => {
    test('should render the workouts index view', async () => {
        const response = await testSession
            .get('/workouts')
            .expect(200)
            .expect('Content-Type', /html/);

        // verifying page
        expect(response.text).toContain('Workouts');
        // verifying workout info on page
        expect(response.text).toContain(`${workout.day}`);
    });
});

describe('GET /workouts/new', () => {
    test('should render the create new workout view', async () => {
        const response = await testSession
            .get('/workouts/new')
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
        const response = await testSession
        .get(`/workouts/${workout._id}/edit`)
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
        const response = await testSession
            .get(`/workouts/${workout._id}`)
            .expect(200)
            .expect('Content-Type', /html/);

        // verifying workout info on page
        expect(response.text).toContain(`${workout.day}`);
        expect(response.text).toContain(`${movement.name}`);
        expect(response.text).toContain(`${workout.exercise[0].weight}`);
        expect(response.text).toContain(`${workout.exercise[0].sets}`);
        expect(response.text).toContain(`${workout.exercise[0].reps}`);
    });
});

describe('POST /workouts', () => {
    test('should create a new workout', async () => {
        await Workout.deleteMany({}); // clears database 

        const validWorkout = {
            day: 'Friday',
            exercise: { // req.body structure (same index across arrays in fields belong in same object) -- this input should yield TWO exercise objects
                movement: [movement._id, userMovement._id],
                weight: ['100', '150'],
                sets: ['1', '2'],
                reps: ['1', '2'],
                minutes: ['', ''],
                caloriesBurned: ['', '']
            },
            createdBy: janeId
        }

        const response = await testSession
            .post('/workouts')
            .send(validWorkout)
            .expect(302);

        // verifying redirect
        expect(response.header.location).toBe('/workouts');

        // verifying workout count
        const count = await Workout.countDocuments({ createdBy: janeId });
        expect(count).toBe(1);

        // verifying length of exercise array in workout
        const createdWorkout = await Workout.findOne({ createdBy: janeId, day: 'Friday' });
        expect(createdWorkout.exercise.length).toBe(2);
    });

    test('should handle error if invalid input', async () => {
        const invalidWorkout = {}

        const response = await testSession
            .post('/workouts')
            .send(invalidWorkout)
            .expect(500)

        expect(response.body.message).toEqual('An error occurred while creating the workout');
    });
});

describe('PUT /workouts/:id', () => {
    let workoutToUpdate = {}
    let updateWorkoutData = {}

    test('should update a workout', async () => {
        workoutToUpdate = await Workout.findOne({ day: 'Friday', createdBy: janeId });

        workout = workoutToUpdate._id;
        expect(workoutToUpdate.exercise.length).toBe(2);

        updateWorkoutData = {
            exercise: { // req.body structure (same index across arrays in fields belong in same object) -- this input should yield ONE exercise object
                    movement: [movement._id],
                    weight: ['5000'],
                    sets: ['1'],
                    reps: ['1'],
                    minutes: [''],
                    caloriesBurned: ['']
            },
            ...workoutToUpdate
        }

        const response = await testSession
            .put(`/workouts/${workoutToUpdate._id}`)
            .send(updateWorkoutData)
            .expect(302);

        // verifying redirect
        expect(response.header.location).toBe('/workouts');
        
        // checking update workout against input
        const updatedWorkout = await Workout.findById(workoutToUpdate._id);
        expect(updatedWorkout.exercise[0].weight).toEqual(5000);
        expect(updatedWorkout.exercise[0].movement).toEqual(workoutToUpdate.exercise[0].movement);
        expect(updatedWorkout.exercise.length).toBe(1);

    });

    test('should handle error if invalid workout', async () => {
        // invalid workout id, but valid input
        const id = new mongoose.Types.ObjectId();

        const response = await testSession
            .put(`/workouts/${id}`)
            .send(updateWorkoutData)
            .expect(500);

        expect(response.body.message).toEqual('An error occurred while updating the workout');
    });

    test('should handle error if invalid data', async () => {
        // valid workout id, but invalid input
        const response = await testSession
            .put(`/workouts/${workoutToUpdate._id}`)
            .send({})
            .expect(500);

        expect(response.body.message).toEqual('An error occurred while updating the workout');
    });
});

describe('PUT /workouts/:id/complete', () => {
    test('should toggle isComplete field on workout', async () => {
        const workoutToComplete = await Workout.findOne({ createdBy: janeId });
        expect(workoutToComplete.isComplete).toBe(false); // checking isComplete is default: false

        // toggling to true
        const setToTrueResponse = await testSession
            .put(`/workouts/${workoutToComplete._id}/complete`)
            .expect(200);

        const completedWorkout = await Workout.findById(workoutToComplete._id);
        expect(completedWorkout.isComplete).toBe(true); // verifying update to true


        // toggling to false
        const setToFalseResponse = await testSession
            .put(`/workouts/${workoutToComplete._id}/complete`)
            .expect(200);

        const notCompleteWorkout = await Workout.findById(workoutToComplete._id);
        expect(notCompleteWorkout.isComplete).toBe(false); // verifying update to false
    });

    test('should handle error if invalid input', async () => {
        const id = new mongoose.Types.ObjectId(); // invalid workout id

        const response = await testSession
            .put(`/workouts/${id}/complete`)
            .expect(404);

        expect(response.body.error).toEqual('Workout not found');
    });
});

describe('DELETE /workouts/:id', () => {
    test('should delete a workout', async () => {
        const workoutToDelete = await Workout.findOne({ createdBy: janeId });

        const response = await testSession
            .delete(`/workouts/${workoutToDelete._id}`)
            .expect(302);
        
        // verifying delete
        const deletedWorkout = await Workout.findById(workoutToDelete._id);
        expect(deletedWorkout).toBeNull();
    });

    test('should handle error if invalid workout', async () => {
        const id = new mongoose.Types.ObjectId(); // invalid workout id

        const response = await testSession
            .delete(`/workouts/${id}`)
            .expect(404);
        
        expect(response.body.error).toEqual('Workout not found, could not delete');
    });
});
