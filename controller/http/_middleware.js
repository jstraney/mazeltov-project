const
cookieParser = require('cookie-parser'),
helmet       = require('helmet');

const {
  rand: {
    randStr,
  },
} = require('@mazeltov/core/lib/util');

const {
  requestLogger,
} = require('@mazeltov/core/lib/middleware');

module.exports = (ctx) => {

  const logger = ctx.loggerLib(`${ctx.SERVICE_NAME}/controller/http/_middleware`);

  // TODO: replace this with a call to hookService.invokeReduce('httpMiddleware')
  return [
    (req, res, next) => {
      res.locals.nonce = randStr();
      next();
    },
    helmet({
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
    }),
    requestLogger({ logger }),
    cookieParser(ctx.COOKIE_SECRET, {
      domain: ctx.COOKIE_DOMAIN,
      maxAge: ctx.COOKIE_MAXAGE,
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    }),
  ]

};
