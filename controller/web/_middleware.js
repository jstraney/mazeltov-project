const
path = require('path');

const
bodyParser = require('body-parser'),
express    = require('express'),
Redis      = require('ioredis'),
session    = require('express-session');

const {
  jwtToSession,
  useFlash,
} = require('@mazeltov/middleware');

module.exports = (ctx) => {

  const {
    services,
  } = ctx;

  const logger = ctx.loggerLib(`${ctx.SERVICE_NAME}/controller/web/_middleware`);

  ctx.app.set('views', [
    path.join(ctx.appRoot, 'view'),
  ]);

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

  ctx.app.locals.util = require('@mazeltov/util');

  return [
    express.static('public'),
    bodyParser.urlencoded({ extended: true }),
    session({
      store: new(require('connect-redis')(session))({
        client: new Redis({
          host: ctx.REDIS_HOSTNAME,
          password: ctx.REDIS_PASSWORD,
        }),
      }),
      secret: ctx.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      proxy: true,
    }),
    jwtToSession({
      publicKeyPem: ctx.publicKeyPem,
      getPerson: (id) => ctx.models.personModel.get({id}),
      models: ctx.models,
      logger,
    }),
    // initialize basic locals
    (req, res, next) => {
      res.locals.request = {
        uri: req.path || '/',
        query: req.query || {},
        params: req.params || {},
        body: req.body || {},
      };
      res.locals.session = req.session || {};
      if (req.session && req.session.whoami) {
        res.locals.gate = services.aclService.bindSubject(req.session.whoami);
      } else {
        res.locals.gate = services.aclService.bindSubject({});
      }
      next();
    },
    useFlash({ logger }),
  ];

};
