// migration code here. no need to commit
// try catch, or rollback transaction.
module.exports = async (trx) => {

  await trx.withSchema('access')
    .insert({
      name: 'can yeet own skeet',
      label: 'Can yeet own skeet',
    })
    .into('permission')
    .onConflict('name')
    .merge();

};
