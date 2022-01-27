module.exports = async (ctx, webRouterLoader) => webRouterLoader(ctx, [

  '_middleware',

  require('@mazeltov/core/controller/web'),

  'page',

]);
