
exports.seed = async function(knex) {

  return knex.withSchema('account').insert([
    {
      level: 0,
      label: 'Free Account',
      description: [
        'Our free service that required only an',
        'email address to sign up for',
      ].join(' '),
      /*
       * Alter the migration to include restrictions
       * maxNumberOfPosts etc.
       * hasUnlimitedPosts
       */
    }
  ])
  .into('service')
  .onConflict('level')
  .merge();

};
