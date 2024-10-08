import mongoose from 'mongoose';
import { MongoServerError } from 'mongodb';
import request from 'supertest';
import cookie from 'cookie';
import app from '../../server';

import User, { UserDocument } from '../../models/user';

require('dotenv').config();

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL!);
    await User.deleteMany({});

    const user = await User.create({
        firstName: 'Jane',
        username: 'janedoe',
        email: 'jane@doe.com',
        password: 'password123',
    });
});

afterAll(async () => {
    await mongoose.connection.close();
});

describe('GET /signup', () => {
    test('should render the signup view', async () => {
        const response = await request(app)
            .get('/signup')
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain('Sign Up');
    });
});

describe('GET /login', () => {
    test('should render the login view', async () => {
        const response = await request(app)
            .get('/login')
            .expect(200)
            .expect('Content-Type', /html/);

        expect(response.text).toContain('Login');
    });
});

describe('POST /signup', () => {
    test('should successfully register a user', async () => {
        const userData = {
            firstName: 'John',
            username: 'johndoe',
            email: 'john@doe.com',
            password: 'password123',
            passwordConfirmation: 'password123',
        } 

        jest.spyOn(User, 'create');

        const response = await request(app)
            .post('/signup')
            .send(userData)
            .expect(302);

        expect(User.create).toHaveBeenCalledWith(userData);
        expect(response.header.location).toBe('/workouts');

        const setCookieHeader = cookie.parse(String(response.header['set-cookie']));
        const sessionId = setCookieHeader!['connect.sid'];
        
        expect(sessionId).toBeDefined();
    });

    test('should handle duplicate email', async () => {
        jest.spyOn(User, 'create').mockImplementation(() => {
            const error = new MongoServerError({
                message: 'Duplicate key error',
                code: 11000,
                keyPattern: { email: 1 }
            });
            throw error;
        });

        const response = await request(app)
            .post('/signup')
            .send({
                firstName: 'Copycat Jane',
                username: 'copycatjanedoe',
                email: 'jane@doe.com',
                password: 'password123',
                passwordConfirmation: 'password123',
            })
            .expect(400);

        expect(response.text).toContain('Email is already in use.');

    });

    test('should handle duplicate username', async () => {
        jest.spyOn(User, 'create').mockImplementation(() => {
            const error = new MongoServerError({
                message: 'Duplicate key error',
                code: 11000,
                keyPattern: { username: 1 }
            });
            throw error;
        });

        const response = await request(app)
            .post('/signup')
            .send({
                firstName: 'Copycat Jane',
                username: 'janedoe',
                email: 'copycatjane@doe.com',
                password: 'password123',
                passwordConfirmation: 'password123',
            })
            .expect(400);

        expect(response.text).toContain('Username is already in use.');
    });
});

describe('POST /login', () => {
    test('should successfully log in a user', async () => {
        const response = await request(app)
            .post('/login')
            .send({
                email: 'jane@doe.com',
                password: 'password123'
            })
            .expect(302);

        expect(response.header.location).toBe('/workouts');

        const setCookieHeader = cookie.parse(String(response.header['set-cookie']));
        const sessionId = setCookieHeader!['connect.sid'];

        expect(sessionId).toBeDefined();
    });

    test('should handle invalid email', async () => {
        const response = await request(app)
            .post('/login')
            .send({
                email: 'invalid@doe.com',
                password: 'password123'
            })
            .expect(401);

        expect(response.text).toContain('Invalid email or password, please try again.');
    });

    test('should handle invalid password', async () => {
        const response = await request(app)
            .post('/login')
            .send({
                email: 'jane@doe.com',
                password: 'invalid123'
            })
            .expect(401);
            
        expect(response.text).toContain('Invalid email or password, please try again.');
    });
});

describe('GET /logout', () => {
    test('should successfully log out a user', async () => {
        await request(app)
            .post('/login')
            .send({
                email: 'jane@doe.com',
                password: 'password123',
            })
            .expect(302);

        const response = await request(app)
            .get('/logout')
            .expect(302);

        expect(response.header.location).toBe('/');

        expect(response.header['set-cookie']).not.toBeDefined();
    });
});