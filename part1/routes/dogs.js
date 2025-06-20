var express = require('express');
var router = express.Router();

/* GET dogs with their size and owner's username. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;