const
path = require('path');

const
bodyParser = require('body-parser'),
express    = require('express'),
session    = require('express-session');

const
luxon = require('luxon');

const {
  useFlash,
  preloadAssets,
} = require('@mazeltov/core/lib/middleware');

const {
  Stack,
  httpController,
} = require('@mazeltov/core/lib/controller');

module.exports = (ctx) => {

  const {
    app,
    services,
    services: {
      hookService: {
        redux,
      },
      redisService,
      settingService: {
        getSettings,
      },
    }
  } = ctx;

  const [
    appName,
    sessionSecret,
    trustedProxies,
  ] = getSettings([
    'app.name',
    'app.sessionSecret',
    'app.trustedProxies',
  ]);

  const logger = ctx.loggerLib(`${appName}/controller/web/_middleware`);

  // TODO: find good home for a 'initApp' hook
  app.set('views', redux('viewDir', [
    path.join(ctx.appRoot, 'view'),
  ]));

  app.set('view engine', 'pug');
  app.set('trust proxy', trustedProxies);

  // set global locals
  app.locals = redux('webGlobalLocals', app.locals);

  return httpController('web', ctx)
    .use([
      ['static', express.static('public')],
      ['bodyParser', bodyParser.urlencoded({ extended: true })],
      ['session', session({
        store: new(require('connect-redis')(session))({
          client: redisService,
        }),
        secret: sessionSecret,
        resave: false,
        saveUninitialized: false,
        proxy: true,
      })],
      // initialize locals that are unique per request
      ['useRequestLocals', (req, res, next) => {
        res.locals.request = {
          uri: req.path || '/',
          query: req.query || {},
          params: req.params || {},
          body: req.body || {},
          back: req.get('referer'),
        };
        next();
      }],
      ['preloadAssets', preloadAssets({
        services: ctx.services,
        logger,
      })],
      ['useFlash', useFlash({ logger })],
    ]);

  /*
  const stack = hookService.redux('webMiddleware', new Stack([
    ['static', express.static('public')],
    ['bodyParser', bodyParser.urlencoded({ extended: true })],
    ['session', session({
      store: new(require('connect-redis')(session))({
        client: ctx.ioredis,
      }),
      secret: ctx.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      proxy: true,
    })],
    ['jwtToSession', jwtToSession({
      publicKeyPem: ctx.publicKeyPem,
      getPerson: (id) => ctx.models.personModel.get({id}),
      models: ctx.models,
      logger,
    })],
    // initialize locals that are unique per request
    ['useRequestLocals', (req, res, next) => {
      res.locals.request = {
        uri: req.path || '/',
        query: req.query || {},
        params: req.params || {},
        body: req.body || {},
        back: req.get('referer'),
      };
      next();
    }],
    ['preloadAssets', preloadAssets({
      services: ctx.services,
      logger,
    })],
    ['useFlash', useFlash({ logger })],
  ]));

  return stack.middleware();
  */
};
