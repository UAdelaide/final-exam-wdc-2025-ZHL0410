var express = require('express');
var router = express.Router();

/* GET dogs with their size and owner's username. */
router.get('/dogs', async (req, res) => {
    try {
        const [rowsOfDogs] = await db
    } catch (error) {

    }
});

module.exports = router;