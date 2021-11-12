module.exports = (controllers) => controllers.httpController.apiRouters([

  '_middleware',

  'permission',
  [
    'create',
    'update',
    'remove',
    'list',
  ],

  'role',
  [
    'create',
    'update',
    'remove',
    'list',
  ],

  'person',

  'client',

  'personRole',
  [
    'list',
    'bulkMerge',
    'bulkRemove',
  ],

  'clientRole',
  [
    'list',
    'bulkMerge',
    'bulkRemove',
  ],

  'tokenGrant',

  'scope',
  [
    'list',
    'create',
    'update',
    'remove',
  ],

  'scopePermission',
  [
    'list',
    'bulkCreate',
    'bulkRemove',
  ],

]);

