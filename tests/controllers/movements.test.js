const mongoose = require('mongoose');
const request = require('supertest');
const session = require('supertest-session');
const app = require('../../server');

const User = require('../../models/user');
const Movement = require('../../models/movement');
const movementData = require('../../seed/movementData');

require('dotenv').config();

const testSession = session(app);

let janeId = '';
let movement = {};

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({});
    await Movement.deleteMany({});
    await Movement.create(movementData);

    movement = await Movement.findOne({}).lean();

    const jane = await User.create({
        firstName: 'Jane',
        username: 'janedoe',
        email: 'jane@doe.com',
        password: 'password123',
    });
    janeId = jane._id;

    await testSession
        .post('/login')
        .send({ email: 'jane@doe.com', password: 'password123' });
});

afterAll(async () => {
    testSession.destroy();
    await mongoose.connection.close();
});


// tests for GET views
describe('GET /movements', () => {
    test('should render the movements view', async () => {
        const response = await testSession
            .get('/movements')
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain('Movements');
        expect(response.text).toContain(movementData[0].name);
    });

    test('should filter the movements view based on type', async () => {
        const response = await testSession
            .get('/movements')
            .query({ typeFilter: 'cardio', page: 1 })
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain('Movements');
        expect(response.text).toContain('Running');
    });

    test('should filter the movements view based on muscles', async () => {
        const response = await testSession
            .get('/movements')
            .query({ typeFilter: 'weighted', muscle: 'Chest', page: 1 })
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain('Movements');
        expect(response.text).toContain('Bench Press');
    });
});

describe('GET /movements/new', () => {
    test('should render the create movements view', async () => {
        const response = await testSession
            .get('/movements/new')
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain('Create Movement');
    });
});

describe('GET /movements/:id/edit', () => {
    test('should render the edit movements view', async () => {
        const response = await testSession
            .get(`/movements/${movement._id}/edit`)
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain(`Edit ${movement.name}`);
    });
});


// tests for non-GET methods
describe('POST /movements', () => {
    test('should successfully create a movement', async () => {
        const testMovement = {
            name: 'Bicep Movement',
            description: 'a bicep movement',
            musclesWorked: { Biceps: 'on' }, // form checkbox formats req.body in this manner
            type: 'weighted'
        }

        const response = await testSession
            .post('/movements')
            .send(testMovement)
            .expect(302)
        
        // ensures correct redirect
        expect(response.header.location).toBe('/movements');

        // checking new movement against input
        const createdMovement = await Movement.findOne({ name: testMovement.name });
        expect(createdMovement).toBeDefined();
        expect(createdMovement).toMatchObject({
            name: testMovement.name,
            description: testMovement.description,
            musclesWorked: ['Biceps'],
            type: testMovement.type,
        });
    });

    test('should handle error if invalid input', async () => {
        const response = await testSession
            .post('/movements')
            .send({})
            .expect(400);

        expect(response.body.error).toEqual('Invalid input');
    });
});

describe('PUT /movements/:id', () => {
    test('should successfully update a movement', async () => {
        const testMovement = await Movement.findOne({ name: 'Bicep Movement' }).lean();
        const movementUpdate = {
            ...testMovement,
            musclesWorked: { Forearms: 'on' },
        }

        const response = await testSession
            .put(`/movements/${testMovement._id}`)
            .send(movementUpdate)
            .expect(302)

        // redirect check
        expect(response.header.location).toBe('/movements');


        // checking updated movement against input
        const updatedMovement = await Movement.findById(testMovement._id);

        expect(updatedMovement).toBeDefined();
        expect(updatedMovement).toMatchObject({
            name: testMovement.name,
            description: testMovement.description,
            musclesWorked: ['Forearms'],
            type: testMovement.type,
        });
    });

    test('should handle error if invalid input', async () => {
        const response = await testSession
            .put(`/movements/${movement._id}`)
            .send({})
            .expect(400);

        expect(response.body.error).toEqual('Invalid input');
    });
});

describe('DELETE /movements/:id', () => {
    let testMovement = ''

    beforeAll(async () => {
        testMovement = await Movement.findOne({ name: 'Bicep Movement' }).lean();
    });
    
    test('should successfully delete a movement', async () => {
        const response = await testSession
            .delete(`/movements/${testMovement._id}`)
            .expect(302);

        // redirect check
        expect(response.header.location).toBe('/movements');

        // verifying delete
        const deletedMovement = await Movement.findById(testMovement._id);
        expect(deletedMovement).toBeNull();
    });

    test('should handle error if invalid movement', async () => {
        const response = await testSession
            .delete(`/movements/${testMovement._id}`)
            .expect(404);

        expect(response.body.error).toEqual('Movement not found');
    });
});