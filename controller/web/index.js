module.exports = (controllers) => controllers.httpController.webRouters([
  '_middleware',
  'auth',
  'account',
  'page',
]);

