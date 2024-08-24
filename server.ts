import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import mongoSanitize from 'express-mongo-sanitize';
import fileUpload from 'express-fileupload';
import session, { SessionData } from 'express-session';

import movementsRouter from './routes/movements';
import usersRouter from './routes/users';
import workoutsRouter from './routes/workouts';
import profilesRouter from './routes/profiles';
import requestRouter from './routes/friend-requests';
import favoriteRouter from './routes/favorites';

const app = express();

require('dotenv').config();
const PORT = process.env.PORT;
const DATABASE_URL = process.env.DATABASE_URL!;

mongoose.set('strictQuery', false);
mongoose.connect(DATABASE_URL);

const db = mongoose.connection;

db.on('connected', function () {
    console.log('mongo connected');
});

db.on('error', function (error) {
    console.log(`is mongo not running? ${error.message}`);
});

declare module 'express-session' {
    interface SessionData {
      userId?: string;
    }
}

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(mongoSanitize());
app.use(fileUpload());
app.use(session({
    secret: process.env.SECRET!,
    resave: false,
    saveUninitialized: false
}));
app.use(function (req : Request & { session: SessionData }, res : Response, next : NextFunction) {
    if (req.session.userId) res.locals.user = req.session.userId;
    else res.locals.user = null;
    
    next();
});

function isAuthenticated (req : Request, res : Response, next : NextFunction) {
    if (!req.session.userId) return res.redirect('/login');
    next();
}

app.get('/', function (req, res) {
    res.render('welcome.ejs');
});

app.use(usersRouter);
app.use(isAuthenticated, workoutsRouter);
app.use(isAuthenticated, movementsRouter);
app.use(isAuthenticated, profilesRouter);
app.use(isAuthenticated, requestRouter);
app.use(isAuthenticated, favoriteRouter);

app.listen(PORT, function () {
    console.log(`express is listening on port: ${PORT}`);
});


export default app;