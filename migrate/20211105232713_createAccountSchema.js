
exports.up = async function(knex) {

  const trx = await knex.transaction();

  try {

    await trx.raw('CREATE SCHEMA IF NOT EXISTS account');


    await trx.schema.withSchema('account').createTable('service', (table) => {

      table.integer('level').primary();

      table.string('label');
      table.text('description');

      table.timestamps(true, true);

      table.index('createdAt', 'service_createdAt_brin', 'brin');

    });

    await trx.schema.withSchema('account').createTable('account', (table) => {

      table.integer('personId')
        .primary()
        .references('id')
        .inTable('access.person')
        .onUpdate('CASCADE')
        .onDelete('CASCADE');

      table.integer('serviceLevel')
        .references('level')
        .inTable('account.service')
        .onUpdate('CASCADE')
        .onDelete('CASCADE');

      table.timestamps(true, true);

      table.index('createdAt', 'account_createdAt_brin', 'brin');

    });

    await trx.commit();

  } catch (error) {

    console.log('%o', error);

    await trx.rollback();

    throw error;
  }
};

exports.down = function(knex) {
  return knex.schema.withSchema('account')
    .dropTable('account')
    .dropTable('service');
};
