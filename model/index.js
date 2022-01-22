module.exports = (ctx, modelLoader) => modelLoader(ctx, [
  require('@mazeltov/core/model'),
  require('@mazeltov/access/model'),
]);
