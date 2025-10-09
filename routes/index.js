var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/1', function(req, res, next) {
  res.render('index', { title: 'Express' });
});
router.get('/2', function(req, res, next) {
  res.render('index_pro', { title: 'Express' });
});
router.get('/', function(req, res, next) {
  res.redirect('/user/login');
});

module.exports = router;
