const express = require('express');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const bodyParser = require('body-parser');
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
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(function (req, res, next) {
    if (req.session.userId) {
        res.locals.user = req.session.userId;
    } else {
        res.locals.user = null;
    }
    next();
});

function isAuthenticated (req, res, next) {
    if (!req.session.userId) return res.redirect('/login');
    next();
}

app.get('/', function (req, res) {
    res.render('welcome.ejs');
});

app.use(usersRouter);
app.use(isAuthenticated, workoutsRouter);
app.use(isAuthenticated, movementsRouter);

app.listen(PORT, function () {
    console.log(`express is listening on port: ${PORT}`);
});