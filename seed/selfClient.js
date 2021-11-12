/**
 * The self client refers to the app as a consumer of it's own
 * API. This allows securely 
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

exports.seed = async function(knex) {

  const {
    ORG_NAME,
    SELF_CLIENT_ID,
    SELF_CLIENT_SECRET,
    SELF_CLIENT_REDIRECT_URLS,
  } = process.env;

  const errors = [];

  [
    [ORG_NAME, 'ORG_NAME'],
    [SELF_CLIENT_ID, 'SELF_CLIENT_ID'],
    [SELF_CLIENT_SECRET, 'SELF_CLIENT_SECRET'],
    [SELF_CLIENT_REDIRECT_URLS, 'SELF_CLIENT_REDIRECT_URLS'],
  ].forEach(([envVar, label]) => {
    if (!envVar) {
      errors.push(`${label} must be set in .env to run seeds`);
    }
  });

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }

  const hashedSecret = await bcrypt.hash(SELF_CLIENT_SECRET, 12);

  await knex('client').withSchema('access').insert({
    id: SELF_CLIENT_ID,
    secret: hashedSecret,
    label: ORG_NAME,
    isConfidential: true,
    redirect_urls: SELF_CLIENT_REDIRECT_URLS,
  })
  .onConflict('id')
  .merge();

};

