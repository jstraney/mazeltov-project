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

  router.get('*', [
    viewTemplate({
      title: 'Page Not Found!',
      template: 'error/_404',
      logger,
    }),
  ]);

  const _view50x = viewTemplate({
    title: 'Whoops',
    template: 'error/_50x',
    logger,
  });

  // general error handler
  ctx.app.use((error, req, res, next) => {

    logger.error('%o', error);

    res.locals.error = error;

    return _view50x(req, res);

  });

  return router;

};
