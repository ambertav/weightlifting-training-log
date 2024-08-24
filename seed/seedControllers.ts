import bcrypt from 'bcrypt';

import User from '../models/user';
import Movement from '../models/movement';
import Workout from '../models/workout';
import Favorite from '../models/favorite';
import FriendRequest from '../models/friend-request';

import movementData from './movementData';

// creates two users
export async function seedUsers () {
    try {
        await User.deleteMany({});
        
        const hashedPassword = await bcrypt.hashSync('password123', 10);

        await User.create({
            firstName: 'Jane',
            username: 'jane_doe',
            email: 'jane@example.com',
            password: hashedPassword,
        });

        await User.create({
            firstName: 'John',
            username: 'john_doe',
            email: 'john@example.com',
            password: hashedPassword,
        });


    } catch (error) {
        console.error('User seed error: ', error);
    }
}

// seeds in the default movements
export async function seedMovements () {
    try {
        await Movement.deleteMany({});
        await Movement.create(movementData);

    } catch (error) {
        console.error('Movement seed error: ', error);
    }
}

// creates a workout with default movements, associated with the first seed user
export async function seedWorkout () {
    try {
        await Workout.deleteMany({});

        const user = await User.findOne();

        if (!user) throw Error('Could not find user');

        const snatch = await Movement.findOne({ name: 'Snatch' });
        const cleanAndJerk = await Movement.findOne({ name: 'Clean and Jerk' });

        if (!snatch || !cleanAndJerk) throw Error('Could not find movements');

        await Workout.create({
            day: new Date(),
            exercise: [
                {
                    movement: snatch._id,
                    weight: 150,
                    sets: 5,
                    reps: 1,
                },
                {
                    movement: cleanAndJerk._id,
                    weight: 200,
                    sets: 5,
                    reps: 1,
                },
            ],
            isComplete: false,
            createdBy: user._id,
        });

    } catch (error) {
        console.error('Workout seed error: ', error);
    }
}

// creates a favorite from the seed workout
export async function seedFavorite () {
    try {
        await Favorite.deleteMany({});

        const workout = await Workout.findOne()
            .populate('exercise.movement')
            .lean();

        if (!workout) throw Error('Could not find workout');
        
        const { createdBy } = workout;

        const exerciseInfo = workout.exercise.map(function (exercise) {
            const { movement, ...remaining } = exercise;
            if (typeof movement === 'object' && movement !== null && 'name' in movement) {
                return {
                    movement: {
                        name: movement.name,
                        musclesWorked: movement.musclesWorked,
                        type: movement.type,
                    },
                    ...remaining,
                }
            }
        });

        await Favorite.create({
            name: 'Best Workout',
            exercise: exerciseInfo,
            createdBy
        });

    } catch (error) {
        console.error('Favorite seed error: ', error);
    }
}

// creates a friendship (an accepted request) between the two seed users
export async function seedRequest () {
    try {
        await FriendRequest.deleteMany({});

        const userOne = await User.findOne({ username: 'jane_doe' });
        const userTwo = await User.findOne({ username: 'john_doe' });

        if (!userOne || !userTwo) throw Error('Could not find users');

        await FriendRequest.create({
            from: userTwo._id,
            to: userOne._id,
            status: 'accepted'
        });

    } catch (error) {
        console.error('Request seed error: ', error);
    }
}