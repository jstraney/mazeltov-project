module.exports = (ctx) => require('@mazeltov/service')({
  ...ctx,

  controllerServiceConfig: {
    onSwitchApiRoute: (action, model) => null,
    onSwitchWebRoute: (action, model) => null,
    onSwitchUseArgs: (action, model) => null,
    onSwitchWebTemplate: (action, model) => null,
    onSwitchCommandLineOptions: (action, model) => null,
    onSwitchCommandLineHelp: (action, model) => null,
  },

  emailServiceConfig: {
    senderEmail: 'donotreply@' + ctx.SERVICE_HOSTNAME,
    senderName: ctx.ORG_NAME,
    nodemailer: require('nodemailer'),
    defaultAttachments: [
      {
        filename: 'logo.png',
        path: path.join(ctx.appRoot, 'public/image/logos/logo.png'),
        cid: 'logo',
      },
    ],
  },

  templateServiceConfig: {
    templateDir: 'view',
    pug: require('pug'),
  },

}, [
  'init',
  'acl',
  'controller',
  'template',
  'email',
]);
