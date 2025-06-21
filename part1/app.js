var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

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

    // Create a Users table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner', 'walker') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create a Dogs table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS Dogs (
        dog_id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        size ENUM('small', 'medium', 'large') NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      )
    `);

    // Create a WalkRequests table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS WalkRequests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        dog_id INT NOT NULL,
        requested_time DATETIME NOT NULL,
        duration_minutes INT NOT NULL,
        location VARCHAR(255) NOT NULL,
        status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
      )
    `);

    // Create a WalkApplications table if it doesn't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS WalkApplications (
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        CONSTRAINT unique_application UNIQUE (request_id, walker_id)
      )
    `);

    // Create a WalkRatings table if it doesn't exist
    await db.query(`
      CREATE TABLE WalkRatings (
        rating_id INT AUTO_INCREMENT PRIMARY KEY,
        request_id INT NOT NULL,
        walker_id INT NOT NULL,
        owner_id INT NOT NULL,
        rating INT CHECK (rating BETWEEN 1 AND 5),
        comments TEXT,
        rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
        FOREIGN KEY (walker_id) REFERENCES Users(user_id),
        FOREIGN KEY (owner_id) REFERENCES Users(user_id),
        CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
    )
      `);

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
    const [rowsOfWalkRequests] = await db.execute('SELECT COUNT(*) AS count FROM WalkRequests');
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

    // Insert data if WalkApplications table is empty
    const [rowsOfWalkApplications] = await db.execute('SELECT COUNT(*) AS count FROM WalkApplications');
    if (rowsOfWalkApplications[0].count === 0) {
        await db.execute(`
        INSERT INTO WalkApplications (request_id, walker_id, status)
        VALUES
        ((SELECT request_id FROM WalkRequests WHERE requested_time = '2025-06-10 08:00:00'), (SELECT user_id FROM Users WHERE username = 'bobwalker'), 'accepted'),
        ((SELECT request_id FROM WalkRequests WHERE requested_time = '2025-06-10 09:30:00'), (SELECT user_id FROM Users WHERE username = 'simonwalker'), 'rejected'),
        ((SELECT request_id FROM WalkRequests WHERE requested_time = '2025-06-11 09:30:00'), (SELECT user_id FROM Users WHERE username = 'bobwalker'), 'pending'),
        ((SELECT request_id FROM WalkRequests WHERE requested_time = '2025-06-12 18:30:00'), (SELECT user_id FROM Users WHERE username = 'simonwalker'), 'accepted'),
        ((SELECT request_id FROM WalkRequests WHERE requested_time = '2025-06-13 12:30:00'), (SELECT user_id FROM Users WHERE username = 'bobwalker'), 'pending');
            `);
    }

    // Insert data if WalkRatings table is empty
    const [rowsOfWalkRatings] = await db.execute('SELECT COUNT(*) AS count FROM WalkRatings');
    if (rowsOfWalkRatings[0].count === 0) {
        await db.execute(`
        INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments)
        VALUES
        (
            (SELECT request_id FROM WalkRequests WHERE requested_time = '2025-06-12 18:30:00'),
            (SELECT user_id FROM Users WHERE username = 'simonwalker'),
            (SELECT user_id FROM Users WHERE username = 'carol123'),
            5,
            'Good job and my dog enjoys!'
        );
        `);
    }
    }
  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

app.use('/', indexRouter);
app.use('/users', usersRouter);

// Route to return dogs as JSON
app.get('/api/dogs', async (req, res) => {
  try {
    const [rowsOfDogs] = await db.execute(`
        SELECT d.name AS dog_name, d.size, u.username AS owner_username
        FROM Dogs d
        JOIN Users u ON d.owner_id = u.user_id
        `);
    res.json(rowsOfDogs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// Route to return open walkrequests as JSON
app.get('/api/walkrequests/open', async (req, res) => {
    try {
    const [rowsOfWalkRequests] = await db.execute(`
        SELECT wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
        FROM WalkRequests wr
        JOIN Dogs d ON wr.dog_id = d.dog_id
        JOIN Users u ON d.owner_id = u.user_id
        WHERE wr.status = 'open'
        `);
    res.json(rowsOfWalkRequests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walkrequests' });
  }
});

// Route to return a summary of each walker as JSON
app.get('/api/walkers/summary', async (req, res) => {
    try {
    const [rowsOfWalkerSummary] = await db.execute(`
        SELECT
        u.username AS walker_username,
        COUNT(wr.rating_id) AS total_ratings,
        ROUND(AVG(wr.rating), 1) AS average_rating,
        (
          SELECT COUNT(*)
          FROM WalkRequests wreq
          JOIN WalkApplications wa ON wreq.request_id = wa.request_id
          WHERE wreq.status = 'completed' AND wa.walker_id = u.user_id AND wa.status = 'accepted'
        ) AS completed_walks
        FROM Users u
        LEFT JOIN WalkRatings wr ON u.user_id = wr.walker_id
        WHERE u.role = 'walker'
        GROUP BY u.user_id
        `);
    res.json(rowsOfWalkerSummary);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

module.exports = app;
