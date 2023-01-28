const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const movementsRouter = require('./controllers/movements');
const usersRouter = require('./controllers/users');
const workoutsRouter = require('./controllers/workouts');

const app = express();

require('dotenv').config();
const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL;

mongoose.set('strictQuery', false);
mongoose.connect(DATABASE_URL);

const db = mongoose.connection;

db.on('connected', function () {
    console.log('mongo connected');
});

db.on('error', function (error) {
    console.log(`is mongo not running? ${error.message}`);
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

app.get('/', function (req, res) {
    res.send('Welcome');
});

app.use(usersRouter);
app.use(workoutsRouter);
app.use(movementsRouter);

app.listen(PORT, function () {
    console.log(`express is listening on port: ${PORT}`);
});