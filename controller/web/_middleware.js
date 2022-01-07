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
    services,
    services: {
      hookService,
    }
  } = ctx;

  const logger = ctx.loggerLib(`${ctx.SERVICE_NAME}/controller/web/_middleware`);

  ctx.app.set('views', hookService.redux('viewDir', [
    path.join(ctx.appRoot, 'view'),
  ]));

  ctx.app.set('view engine', 'pug');
  ctx.app.set('trust proxy', ctx.TRUSTED_PROXIES);

  // set global locals
  ctx.app.locals.NODE_ENV = ctx.NODE_ENV;
  ctx.app.locals.SERVICE_NAME = ctx.SERVICE_NAME;
  ctx.app.locals.SERVICE_HOSTNAME = ctx.SERVICE_NAME;
  ctx.app.locals.SERVICE_PORT = ctx.SERVICE_PORT;
  ctx.app.locals.SERVICE_URL = ctx.SERVICE_URL;
  ctx.app.locals.ORG_NAME = ctx.ORG_NAME
  ctx.app.locals.ORG_SUPPORT_EMAIL = ctx.ORG_SUPPORT_EMAIL
  ctx.app.locals.ORG_SUPPORT_PHONE = ctx.ORG_SUPPORT_PHONE
  ctx.app.locals.luxon = luxon;
  ctx.app.locals.util = require('@mazeltov/core/lib/util');

  hookService.hook('webGlobalLocals', ctx.app.locals);

  ctx.app.locals.basedir = path.resolve(ctx.appRoot, 'view');

  const controller = httpController('web', ctx);

  controller.use([
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

  return controller;

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
