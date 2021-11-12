const {
  canAccess,
  consumeArgs,
  redirect,
  sendEmail,
  useArgs,
  validateArgs,
  viewTemplate,
} = require('@mazeltov/middleware');

module.exports = ( ctx = {} ) => {

  const {
    _requireSessionAuth,
    _useCSRF,
    _requireCSRF,
    loggerLib,
    models,
    models: {
      accountModel,
      personRoleModel,
      tokenGrantModel,
    },
    services: {
      emailService,
    },
  } = ctx;

  const logger = loggerLib('app/controller/web/account');

  const router = require('express').Router();

  router.get('/account', [
    _requireSessionAuth,
    useArgs({
      claims: [
        ['sub', 'personId'],
      ],
      logger,
    }),
    canAccess({
      checkMethod: accountModel.canGet,
      models,
      errorTemplate: 'error/_403',
      logger,
    }),
    validateArgs({
      validator: accountModel.validateGet,
      logger,
    }),
    consumeArgs({
      consumer: accountModel.get,
      logger,
    }),
    viewTemplate({
      template: 'account/view',
      logger,
    }),
  ]);

  router.get('/sign-up', [
    _useCSRF,
    viewTemplate({
      title: 'Account Registration',
      template: 'account/new',
    }),
  ]);

  router.post('/sign-up', [
    _requireCSRF,
    _useCSRF,
    useArgs({
      body: [
        'email',
        'fullName',
        'password',
      ],
      logger,
    }),
    validateArgs({
      validator: accountModel.validateCreate,
      errorRedirectURL: 'back',
      logger,
    }),
    consumeArgs({
      consumer: accountModel.create,
      logger,
    }),
    sendEmail({
      emailService,
      emailTemplate: 'mail/account/new',
      subject: 'New Account',
      toKey: 'email',
      logger,
    }),
    async (req, res, next) => {

      const {
        result = null,
        error,
      } = res.locals;

      if (result) {

        const {
          password
        } = req.args;

        const tokenGrant = await tokenGrantModel.createToken({
          client_id: ctx.SELF_CLIENT_ID,
          client_secret: ctx.SELF_CLIENT_SECRET,
          username: result.username,
          password,
          grant_type: 'password',
        }).catch(next);

        const {
          access_token,
          refresh_token,
          expires,
        } = tokenGrant;

        res.cookie('refresh_token', refresh_token, {
          domain: ctx.COOKIE_DOMAIN,
          maxAge: ctx.COOKIE_MAXAGE,
          sameSite: 'strict',
          secure: true,
          httpOnly: true,
          signed: true,
        });

        res.cookie('access_token', access_token, {
          domain: ctx.COOKIE_DOMAIN,
          maxAge: ctx.COOKIE_MAXAGE,
          sameSite: 'strict',
          secure: true,
          httpOnly: true,
          signed: true,
        });

      }

      next();

    },
    redirect({
      resultRedirectURL: '/account',
      errorRedirectURL: 'back',
      flashResultMessage: [
        'Your account has been successfully created. We have sent an email',
        'that will be used to finish verifying your account.',
      ].join(' '),
      logger,
    }),
  ]);

  return router;

};
