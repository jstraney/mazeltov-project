module.exports = (ctx) => require('@mazeltov/model')(ctx, [
  'permission',
  'role',
  'rolePermission',
  'person',
  'client',
  'scope',
  'scopePermission',
  'personRole',
  'clientRole',
  'tokenGrant',
  'passwordReset',
  'passwordResetRequest',
  'account',
]);