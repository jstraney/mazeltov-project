module.exports = async (ctx, cliControllerLoader) => cliControllerLoader(ctx, [
  require('@mazeltov/core/controller/cli/index.js'),
]);
