const
express      = require('express'),
bodyParser   = require('body-parser');

module.exports = (ctx) => [
  bodyParser.json(),
];
