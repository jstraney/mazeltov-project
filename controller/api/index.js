module.exports = async (ctx, apiRouterLoader) => apiRouterLoader(ctx, [

  '_middleware',

  require('@mazeltov/access/controller/api'),

]);
