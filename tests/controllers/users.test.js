const mongoose = require('mongoose');
const request = require('supertest');
const cookie = require('cookie');
const app = require('../../server');

const User = require('../../models/user');

require('dotenv').config();

beforeAll(async () => {
    await mongoose.connection.close();
    await mongoose.connect(process.env.MONGO_URL);
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

describe('POST /signup', () => {
    test('should successfully register a user', async () => {
        const userData = {
            firstName: 'John',
            username: 'johndoe',
            email: 'john@doe.com',
            password: 'password123',
            passwordConfirmation: 'password123',
        }

        jest.spyOn(User, 'create').mockResolvedValue({
            _id: 'fakeUserId',
            ...userData,
        });

        const response = await request(app)
            .post('/signup')
            .send(userData)
            .expect(302);

        expect(User.create).toHaveBeenCalledWith(userData);
        expect(response.header.location).toBe('/workouts');

        const cookies = cookie.parse(response.header['set-cookie'].join('; '));
        const sessionId = cookies['connect.sid'];

        expect(sessionId).toBeDefined();
    });

    test('should handle duplicate email', async () => {
        jest.spyOn(User, 'create').mockImplementation(() => {
            const error = new mongoose.Error.ValidationError();
            error.code = 11000;
            error.keyPattern = { email: 1 }
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
            const error = new mongoose.Error.ValidationError();
            error.code = 11000;
            error.keyPattern = { username: 1 }
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

        const cookies = cookie.parse(response.header['set-cookie'].join('; '));
        const sessionId = cookies['connect.sid'];

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