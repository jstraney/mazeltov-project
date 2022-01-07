const
fs    = require('fs'),
http  = require('http'),
https = require('https'),
path  = require('path');

const {
  collection: {
    cross,
  },
} = require('@mazeltov/core/lib/util');

const {
  requireAuth,
  requireSessionAuth,
  useCSRF,
  requireCSRF,
} = require('@mazeltov/core/lib/middleware');

module.exports = async ( ctx = {}) => {

  const {
    SERVICE_CERT_FILE,
    SERVICE_KEY_FILE,
    SERVICE_PROTO,
    appRoot,
    loggerLib,
    publicKeyPem,
    services: {
      routeService: {
        route,
      },
      hookService: {
        redux,
      },
    },
  } = ctx;

  const logger = loggerLib(`${ctx.SERVICE_NAME}/controller`);

  const app = require('express')();

  const nextCtx = {
    ...ctx,
    app,
    // static instances of middleware shared across http controllers that are
    // so common in how they are configured, only once instance is made
    // hence "static"
    ...redux('staticHttpMiddleware', {}),
  };

  const controllers = await require('@mazeltov/core/controller')(nextCtx, [
    'cli',
    'http',
  ]);

  const [ command ] = process.argv.slice(2);

  if (command === 'start') {

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
      logger.info('%s running on %s:%s', ctx.SERVICE_NAME, ctx.SERVICE_IFACE, ctx.SERVICE_PORT);
    });

  } else if (command) {

    const cli = require('./cli')(controllers);

    // these are called to close connection pools and end process.
    ctx.db.destroy();
    ctx.ioredis.disconnect();

  }

};
