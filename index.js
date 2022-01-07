const
fs   = require('fs'),
path = require('path'),
url  = require('url');

module.exports = (async () => {

  require('dotenv').config();

  const ctx = {

    // app config,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
    COOKIE_MAXAGE: process.env.COOKIE_MAXAGE,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGIN,

    NODE_ENV: process.env.NODE_ENV,

    ORG_NAME: process.env.ORG_NAME,
    ORG_SUPPORT_EMAIL: process.env.ORG_SUPPORT_EMAIL,
    ORG_SUPPORT_PHONE: process.env.ORG_SUPPORT_PHONE,

    REDIS_HOSTNAME: process.env.REDIS_HOSTNAME,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,

    SELF_CLIENT_ID: process.env.SELF_CLIENT_ID,
    SELF_CLIENT_REDIRECT_URLS: process.env.SELF_CLIENT_REDIRECT_URLS,
    SELF_CLIENT_SECRET: process.env.SELF_CLIENT_SECRET,

    SERVICE_CERT_FILE: process.env.SERVICE_CERT_FILE,
    SERVICE_KEY_FILE: process.env.SERVICE_KEY_FILE,
    SERVICE_NAME: process.env.SERVICE_NAME,
    SERVICE_HOSTNAME: process.env.SERVICE_HOSTNAME,
    SERVICE_IFACE: process.env.SERVICE_IFACE,
    SERVICE_PORT: process.env.SERVICE_PORT,
    SERVICE_PROTO: process.env.SERVICE_PROTO,
    SERVICE_URL: url.format({
      protocol: process.env.SERVICE_PROTO,
      hostname: process.env.SERVICE_HOSTNAME,
      port: process.env.SERVICE_PORT,
    }),

    SESSION_SECRET: process.env.SESSION_SECRET,

    TRUSTED_PROXIES: process.env.TRUSTED_PROXIES,

    // global stuff
    appRoot: __dirname,
    db: require('knex')(require('./knexfile')),
    ioredis: new (require('ioredis'))({
      host: process.env.REDIS_HOSTNAME,
      password: process.env.REDIS_PASSWORD,
    }),
    loggerLib: require('@mazeltov/core/lib/logger'),
    publicKeyPem: fs.readFileSync(process.env.JWT_RSA_PUBLIC_KEY_PATH),
    privateKeyPem: fs.readFileSync(process.env.JWT_RSA_PRIVATE_KEY_PATH),

  };

  const {
    serviceLoader,
    modelLoader,
  } = await require('@mazeltov/core/loader')(ctx, [
    'service',
    'model',
  ]);

  const services = await require('./service')(ctx, serviceLoader);

  const models = await require('./model')({
    ...ctx,
    services,
  }, modelLoader);

  const controllers = await require('./controller')({
    ...ctx,
    services,
    models,
  });

  return {
    ...ctx,
    models,
    services,
    controllers,
  };

})();
