import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../server';

import User from '../../models/user';
import Movement, { MovementDocument } from '../../models/movement';

import movementData from '../../seed/movementData';

require('dotenv').config();

let cookie : string;

let janeId = '';
let movement = {} as MovementDocument;

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL!);
    await User.deleteMany({});
    await Movement.deleteMany({});
    await Movement.create(movementData);

    movement = await Movement.findOne({}).lean() as MovementDocument;

    const jane = await User.create({
        firstName: 'Jane',
        username: 'janedoe',
        email: 'jane@doe.com',
        password: 'password123',
    });
    janeId = jane._id;

    const loginResponse = await request(app)
        .post('/login')
        .send({ email: 'jane@doe.com', password: 'password123' });
    
    cookie = loginResponse.headers['set-cookie'][0];   
});

afterAll(async () => {
    await mongoose.connection.close();
});


// tests for GET views
describe('GET /movements', () => {
    test('should render the movements view', async () => {
        const response = await request(app)
            .get('/movements')
            .set('Cookie', cookie)
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain('Movements');
        expect(response.text).toContain(movementData[0].name);
    });

    test('should filter the movements view based on type', async () => {
        const response = await request(app)
            .get('/movements')
            .set('Cookie', cookie)
            .query({ typeFilter: 'cardio', page: 1 })
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain('Movements');
        expect(response.text).toContain('Running');
    });

    test('should filter the movements view based on muscles', async () => {
        const response = await request(app)
            .get('/movements')
            .set('Cookie', cookie)
            .query({ typeFilter: 'weighted', muscle: 'Chest', page: 1 })
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain('Movements');
        expect(response.text).toContain('Bench Press');
    });
});

describe('GET /movements/new', () => {
    test('should render the create movements view', async () => {
        const response = await request(app)
            .get('/movements/new')
            .set('Cookie', cookie)
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain('Create Movement');
    });
});

describe('GET /movements/:id/edit', () => {
    test('should render the edit movements view', async () => {
        const response = await request(app)
            .get(`/movements/${movement._id}/edit`)
            .set('Cookie', cookie)
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

        const response = await request(app)
            .post('/movements')
            .set('Cookie', cookie)
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
        const response = await request(app)
            .post('/movements')
            .set('Cookie', cookie)
            .send({})
            .expect(400);

        expect(response.body.error).toEqual('Invalid input');
    });
});

describe('PUT /movements/:id', () => {
    test('should successfully update a movement', async () => {
        const testMovement : MovementDocument | null = await Movement.findOne({ name: 'Bicep Movement' }).lean();
        expect(testMovement).not.toBeNull();
        const movementUpdate = {
            ...testMovement,
            musclesWorked: { Forearms: 'on' },
        }

        const response = await request(app)
            .put(`/movements/${testMovement!._id}`)
            .set('Cookie', cookie)
            .send(movementUpdate)
            .expect(302)

        // redirect check
        expect(response.header.location).toBe('/movements');


        // checking updated movement against input
        const updatedMovement = await Movement.findById(testMovement!._id);
        expect(updatedMovement).toBeDefined();
        expect(updatedMovement).toMatchObject({
            name: testMovement!.name,
            description: testMovement!.description,
            musclesWorked: ['Forearms'],
            type: testMovement!.type,
        });
    });

    test('should handle error if invalid input', async () => {
        const response = await request(app)
            .put(`/movements/${movement._id}`)
            .set('Cookie', cookie)
            .send({})
            .expect(400);

        expect(response.body.error).toEqual('Invalid input');
    });
});

describe('DELETE /movements/:id', () => {
    let testMovement = {} as MovementDocument;

    beforeAll(async () => {
        testMovement = await Movement.findOne({ name: 'Bicep Movement' }).lean() as MovementDocument;
    });
    
    test('should successfully delete a movement', async () => {
        const response = await request(app)
            .delete(`/movements/${testMovement._id}`)
            .set('Cookie', cookie)
            .expect(302);

        // redirect check
        expect(response.header.location).toBe('/movements');

        // verifying delete
        const deletedMovement = await Movement.findById(testMovement._id);
        expect(deletedMovement).toBeNull();
    });

    test('should handle error if invalid movement', async () => {
        const response = await request(app)
            .delete(`/movements/${testMovement._id}`)
            .set('Cookie', cookie)
            .expect(404);

        expect(response.body.error).toEqual('Movement not found');
    });
});