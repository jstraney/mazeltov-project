const {
  useArgs,
  validateArgs,
  viewTemplate,
} = require('@mazeltov/middleware');

module.exports = ( ctx = {} ) => {

  const {
    _requireSessionAuth,
    _useCSRF,
    _requireCSRF,
    loggerLib,
  } = ctx;

  const logger = loggerLib('app/controller/web/page');

  const router = require('express').Router();

  router.get('/', [
    viewTemplate({
      title: 'Welcome',
      template: 'index',
    })
  ]);

  return router;

};
