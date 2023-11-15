const mongoose = require('mongoose');
const { seedUsers, seedMovements, seedWorkout, seedFavorite, seedRequest } = require('./seedControllers');

// add mongo database connection url to .env file...
require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL;

mongoose.set('strictQuery', false);
mongoose.connect(DATABASE_URL);


// then, run this file to seed data into database
async function seedAll () {
    try {
        await seedUsers();
        await seedMovements();
        await seedWorkout();
        await seedFavorite();
        await seedRequest();

        console.log('All seed functions completed successfully');

    } catch (error) {
        console.error('Error while seeding all: ', error);
    }
    finally {
        mongoose.disconnect();
    }
}

seedAll();