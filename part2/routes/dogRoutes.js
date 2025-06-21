const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all dogs
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT dog_id, name, email, role FROM Users');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;