/**
 * TODO: consider moving this into the
 * @mazeltov/cli repo and offer hooks or callbacks to register
 * migration directories.
 */
require('dotenv').config();

const [ schema ] = process.argv.slice(3);

const {
  snakeCase,
  camelCase,
} = require('change-case');

const toCamelCase = (row) => {

  if (typeof row !== 'object') {
    return row;
  }

  return  Object.keys(row).reduce((obj, key) => ({
    ...obj,
    [camelCase(key)]: row[key],
  }), {});

}

const {
  DB_CLIENT,
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_DATABASE,
  DB_DEBUG,
  DB_MIN_POOL = 2,
  DB_MAX_POOL = 10,
  DB_TIMEOUT = 60000,
  NODE_ENV,
} = process.env;

module.exports = {
  client: DB_CLIENT,
  debug: DB_DEBUG === 'true',
  wrapIdentifier: (value) => {
    if (value === '*') {
      return value;
    }
    return `"${snakeCase(value)}"`;
  },
  postProcessResponse: (result) => {
    if (Array.isArray(result)) {
      return result.map(toCamelCase);
    } else if (typeof result === 'object') {
      return toCamelCase(result);
    }
    return result;
  },
  connection: {
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    database: DB_DATABASE,
  },
  pool : {
    min: DB_MIN_POOL,
    max: DB_MAX_POOL,
  },
  acquireConnectionTimeout: DB_TIMEOUT,
  migrations: {
    directory: './migrate',
  },
  seeds: {
    directory: NODE_ENV === 'production' ? './seed/prod' : './seed/dev',
  },
};
