module.exports = (controllers) => controllers.cliController.consoleCommands([
  require('@mazeltov/access/controller/cli'),
]).prepareAndRun(process.argv.slice(2));
