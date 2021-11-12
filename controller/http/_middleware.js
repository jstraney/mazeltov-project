const
cookieParser = require('cookie-parser'),
helmet       = require('helmet');

const {
  requestLogger,
} = require('@mazeltov/middleware');

module.exports = (ctx) => {

  const logger = ctx.loggerLib(`${ctx.SERVICE_NAME}/controller/http/_middleware`);

  return [
    helmet(),
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
