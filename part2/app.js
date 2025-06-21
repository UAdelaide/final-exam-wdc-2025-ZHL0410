const express = require('express');
// include session package
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Session
app.use(session({
    secret: 'mySessionSecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false
    }
}));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');
// add dogRoutes
const dogRoutes = require('./routes/dogRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);
// use dogRoutes
app.use('/api/dogs', dogRoutes);

// Export the app instead of listening here
module.exports = app;