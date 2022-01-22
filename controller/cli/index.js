module.exports = async (ctx, cliControllerLoader) => cliControllerLoader(ctx, [
  require('@mazeltov/core/controller/cli/index.js'),
  require('@mazeltov/access/controller/cli'),
]);
