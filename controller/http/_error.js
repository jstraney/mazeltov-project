const {
  useArgs,
  validateArgs,
  viewTemplate,
  errorHandlers: {
    normalizeError,
  },
} = require('@mazeltov/core/lib/middleware');

const {
  error: {
    getHttpErrorStatusCode,
  },
} = require('@mazeltov/core/lib/util');

module.exports = ( ctx = {} ) => {

  const {
    _requireSessionAuth,
    _useCSRF,
    _requireCSRF,
    loggerLib,
    services: {
      settingService: {
        getSettings,
      }
    },
  } = ctx;

  const [
    appName
  ] = getSettings([
    'app.name',
  ])

  const logger = loggerLib(`${appName}/controller/http/_error`);

  const router = require('express').Router();

  const _view404 = viewTemplate({
    title: 'Page Not Found!',
    template: 'error/_404',
    logger,
  });

  router.get('/api/*', (req, res) => {
      return res.status(404).json({
        error: '_notFound',
        message: 'This api route does not exist',
        help: null,
      });
  });

  router.get('*', (req, res) => {
    return _view404(req, res);
  });

  const _view50x = viewTemplate({
    title: 'Whoops',
    template: 'error/_50x',
    logger,
  });

  // general error handler
  ctx.app.use((error, req, res, next) => {

    logger.error('%o', error);

    if (/^\/api\//.test(req.path)) {

      const code = getHttpErrorStatusCode(error);

      if (process.env.NODE_ENV !== 'development') {
        delete error.stack;
      }

      return res.status(code).json(error);

    }

    res.locals.error = error;

    return _view50x(req, res);

  });

  return router;

};
