const
fs    = require('fs'),
http  = require('http'),
https = require('https'),
path  = require('path');

const {
  collection: {
    cross,
  },
} = require('@mazeltov/util');

const {
  requireAuth,
  requireSessionAuth,
  useCSRF,
  requireCSRF,
} = require('@mazeltov/middleware');

module.exports = ( ctx = {}) => {

  const {
    SERVICE_CERT_FILE,
    SERVICE_KEY_FILE,
    SERVICE_PROTO,
    appRoot,
    loggerLib,
    publicKeyPem,
  } = ctx;

  const logger = loggerLib(`${ctx.SERVICE_NAME}/controller`);

  const app = require('express')();

  const nextCtx = {
    ...ctx,
    app,
    // static instances of middleware shared across http controllers
    _requireAuth: requireAuth({
      publicKeyPem,
      logger,
    }),
    _requireSessionAuth: requireSessionAuth({
      publicKeyPem,
      redirectUriOnFail: '/sign-in',
      logger,
    }),
    _useCSRF: useCSRF({
      errorRedirectURL: 'back',
      logger,
    }),
    _requireCSRF: requireCSRF({
      authorizedHostname: ctx.SERVICE_HOSTNAME,
      errorRedirectURL: '/sign-in',
      logger,
    }),
  };

  const controllers = require('@mazeltov/controller')(nextCtx, [
    'cli',
    'http',
  ]);

  const [ command ] = process.argv.slice(2);

  if (['start'].includes(command)) {

    app.use(require('./http/_middleware')(nextCtx));

    const api = require('./api')(controllers);

    if (api.length) {
      app.use('/api', api);
    }

    const web = require('./web')(controllers);

    if (web.length) {
      app.use('/', web);
    }

    let server;

    if (SERVICE_PROTO === 'https') {
      const cert = fs.readFileSync(path.resolve(appRoot, SERVICE_CERT_FILE));
      const key  = fs.readFileSync(path.resolve(appRoot, SERVICE_KEY_FILE));

      server = https.createServer({key, cert}, app);

    } else {
      server = http.createServer(app);
    }

    app.use(require('./http/_error')(nextCtx));

    server.listen(ctx.SERVICE_PORT, ctx.SERVICE_IFACE, () => {
      console.log('%s %s:%s', ctx.SERVICE_NAME, ctx.SERVICE_IFACE, ctx.SERVICE_PORT);
    });

  } else if (command) {

    const cli = require('./cli')(controllers);

  }

};
