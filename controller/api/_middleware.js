const
express      = require('express'),
bodyParser   = require('body-parser');

const {
  Stack,
  httpController,
} = require('@mazeltov/core/lib/controller');

module.exports = (ctx) => {

  const controller = httpController('api', ctx);

  controller.use([
    bodyParser.json(),
  ]);

  return controller;

};
