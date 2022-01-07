module.exports = (ctx, serviceLoader) => serviceLoader({
  ...ctx,

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
  require('@mazeltov/core/service'),
]);
