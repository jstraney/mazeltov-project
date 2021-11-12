const {
  viewTemplate,
} = require('@mazeltov/middleware');

module.exports = ( ctx = {} ) => {

  const router = require('express').Router();

  router.get('/test-email', [
    viewTemplate({
      template: 'mail/account/frag',
    }),
  ]);

  return router;

};
