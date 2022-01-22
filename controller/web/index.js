module.exports = async (ctx, webRouterLoader) => webRouterLoader(ctx, [

  '_middleware',

  'admin',

  'page',

  require('@mazeltov/access/controller/web'),

]);
