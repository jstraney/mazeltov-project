const bcrypt = require('bcrypt');

const {
  capitalCase,
} = require('change-case');

const {
  rand: {
    randStr,
  },
  collection: {
    buildArray,
  },
  type: {
    isNotNull,
  },
} = require('@mazeltov/util');

const {
  SERVICE_HOSTNAME,
  DEFAULT_PERSON_PASSWORD,
} = process.env;

exports.seed = async function(knex) {

  if (!DEFAULT_PERSON_PASSWORD) {
    throw new Error('DEFAULT_PERSON_PASSWORD must be defined in .env');
  }

  const trx = await knex.transaction();

  try {

    await trx('person').withSchema('access').insert([
      {
        id: 1,
        username: 'test_admin1',
        fullName: 'Test Admin 1',
        email: `test_admin1@${SERVICE_HOSTNAME}`,
        password: bcrypt.hashSync(DEFAULT_PERSON_PASSWORD, 12),
        isEmailVerified: true,
        emailVerificationToken: randStr(32),
        mobilePhoneCountryCode: 'US',
        mobilePhoneAreaCode: '352',
        mobilePhoneNumber: '4547665',
      },
      {
        id: 2,
        username: 'test_customer1',
        fullName: 'Test Customer',
        email: `test_customer2@${SERVICE_HOSTNAME}`,
        password: bcrypt.hashSync(DEFAULT_PERSON_PASSWORD, 12),
        isEmailVerified: true,
        emailVerificationToken: randStr(32),
        mobilePhoneCountryCode: 'US',
        mobilePhoneAreaCode: '352',
        mobilePhoneNumber: '4547665',
      },
    ])
    .onConflict('username')
    .merge();

    await trx('personRole').withSchema('access').insert([
      {
        personId: 1,
        roleName: 'administrator',
      },
      {
        personId: 2,
        roleName: 'customer',
      },
    ])
    .onConflict(['personId', 'roleName'])
    .merge();

    await trx('account').withSchema('account')
      .insert({
        personId: 2,
        serviceLevel: 0,
      })
      .onConflict('personId')
      .merge();

    await trx
      .raw('SELECT setval(\'access.person_id_seq\', (SELECT MAX(id) from access.person))')

    await trx.commit();

  } catch (error) {

    console.error(error);

    await trx.rollback();
  }

};
