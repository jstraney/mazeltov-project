/**
 * This is where it is recommended to seed your app with
 * permissions, roles, and assign permissions to roles
 *
 * Making use of the cross helper can really speed things up
 * and reduce typing
 */
const {
  sentenceCase,
} = require('change-case');

const {
  collection: {
    cross,
  },
  string: {
    joinWords,
  },
} = require('@mazeltov/core/lib/util');

/**
 * TODO: set up docs explaining
 * - relations of role, permission, rolePermission
 * - semantics of permissions
 * - scoped and unscoped permissions
 * - scoped grants and how they play with permissions
 * For more info on how Mazeltov handles authorization:
 * https://link.to.docs.here
 */
exports.seed = async function(knex) {

  const trx = await knex.transaction();

  try {

    await trx('role').withSchema('access').insert([
      {
        name: 'administrator',
        label: 'Administrator',
        isAdministrative: true,
      },
      {
        name: 'customer',
        label: 'Customer',
      },
    ])
    .onConflict('name')
    .merge();

    // Now add permissions and rolePermissions
    const permissionNames = [
      ...cross(
        ['can'],
        ['create', 'update', 'remove', 'list', 'get'],
        ['any', 'own'],
        ['account'],
      ),
    ]
    .map(joinWords);

    await trx('permission').withSchema('access').insert(permissionNames.map((name) => {
      return {
        name,
        label: sentenceCase(name),
      };
    }))
    .onConflict('name')
    .merge();

    await trx('rolePermission').withSchema('access').insert([
      ...cross(
        [
          'customer',
        ],
        [
          'can remove own account',
          'can update own account',
          'can get own account',
        ],
      ),
    ].map(([roleName, permissionName]) => {
      return {
        roleName,
        permissionName,
      };
    }))
    .onConflict(['roleName', 'permissionName'])
    .merge();

    await trx.commit();

  } catch (error) {

    console.error('%o', error);

    await trx.rollback();

    throw error;

  }

};
