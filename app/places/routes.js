'use strict';

var express = require('express');
var router = express.Router();
var api = express.Router();
var secureAPI = express.Router();
secureAPI.use(require('../middleware').auth);

router.use('/api', api);
router.use('/api', secureAPI);

module.exports = router;
