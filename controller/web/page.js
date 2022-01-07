const {
  viewTemplate,
} = require('@mazeltov/core/lib/middleware');

const {
  webController,
} = require('@mazeltov/core/lib/controller');

module.exports = ( ctx = {} ) => {

  const {
    models,
  } = ctx;

  const controller = webController('page', ctx)

  controller.get('home', [
    viewTemplate({
      title: 'Welcome',
      template: 'index',
      logger,
    }),
  ]);

  return controller;

};
