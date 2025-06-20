var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var dogsRouter = require('./routes/dogs');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let db;

(async () => {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // Set your MySQL root password
    });

    // Create the database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    // Now connect to the created database
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

    // Insert data if Users table is empty
    const [rowsOfUsers] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (rowsOfUsers[0].count === 0) {
      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role)
        VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('simonwalker', 'simon@example.com', 'hashed000', 'walker'),
        ('lucy123', 'lucy@example.com', 'hashed999', 'owner');
      `);
    }

    // Insert data if Dogs table is empty
    const [rowsOfDogs] = await db.execute('SELECT COUNT(*) AS count FROM Dogs');
    if (rowsOfDogs[0].count === 0) {
        await db.execute(`
            INSERT INTO Dogs (owner_id, name, size)
            VALUES
            ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Max', 'medium'),
            ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Bella', 'small'),
            ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Oreo', 'small'),
            ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Ocean', 'large'),
            ((SELECT user_id FROM Users WHERE username = 'lucy123'), 'Bubu', 'small');
            `);
    }

    // Insert data if WalkRequests table is empty
    const [rowsOfWalkRequests] = await db.execute('SELECT COUNT(*) AS count FROM Dogs');
    if (rowsOfWalkRequests[0].count === 0) {
        await db.execute(`
            INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
            VALUES
            ((SELECT dog_id FROM Dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
            ((SELECT dog_id FROM Dogs WHERE name = 'Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
            ((SELECT dog_id FROM Dogs WHERE name = 'Oreo'), '2025-06-11 09:30:00', 60, 'Norwood', 'open'),
            ((SELECT dog_id FROM Dogs WHERE name = 'Ocean'), '2025-06-12 18:30:00', 40, 'Melbourne Rd', 'completed'),
            ((SELECT dog_id FROM Dogs WHERE name = 'Bubu'), '2025-06-13 12:30:00', 30, 'Kensington Park', 'cancelled');
            `);
        console.log('db connection succeeds and records stored.');
    }
  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

app.use('/', indexRouter);
app.use('/users', usersRouter);

module.exports = app;
