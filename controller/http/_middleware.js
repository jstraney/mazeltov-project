const
cookieParser = require('cookie-parser'),
helmet       = require('helmet');

const {
  httpController,
} = require('@mazeltov/core/lib/controller');

const {
  rand: {
    randStr,
  },
} = require('@mazeltov/core/lib/util');

const {
  requestLogger,
} = require('@mazeltov/core/lib/middleware');

module.exports = (ctx) => {

  const {
    services: {
      settingService: {
        getSettings,
      },
    }
  } = ctx;

  const [
    appName,
    cookieDomain,
    cookieSecret,
    cookieMaxage,
  ] = getSettings([
    'app.name',
    'app.cookieDomain',
    'app.cookieSecret',
    'app.cookieMaxage',
  ]);

  const logger = ctx.loggerLib(`${appName}/controller/http/_middleware`);

  return httpController('base', ctx).use([
    ['useNonce', (req, res, next) => {
      res.locals.nonce = randStr();
      next();
    }],
    ['helmet', helmet({
      // Some web form functionality depends on the referrer to be set
      referrerPolicy: { policy: 'same-origin' },
      contentSecurityPolicy:{
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": [
            "'self'",
            (req, res) => `'nonce-${res.locals.nonce}'`
          ],
        },
      },
    })],
    ['requestLogger', requestLogger({ logger })],
    ['cookieParser', cookieParser(cookieSecret, {
      domain: cookieDomain,
      maxAge: cookieMaxage,
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    })],
  ]);

};
