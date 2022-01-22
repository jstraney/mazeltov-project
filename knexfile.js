require('dotenv').config();

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

module.exports = async (config = null) => {

  const {
    APP_DB_CLIENT,
    APP_DB_USER,
    APP_DB_PASSWORD,
    APP_DB_HOST,
    APP_DB_DATABASE,
    APP_DB_DEBUG,
    APP_DB_MIN_POOL = 2,
    APP_DB_MAX_POOL = 10,
    APP_DB_TIMEOUT = 60000,
  } = (config || process.env);

  const {
    NODE_ENV,
  } = process.env;

  return {
    client: APP_DB_CLIENT,
    debug: APP_DB_DEBUG === 'true',
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
      user: APP_DB_USER,
      password: APP_DB_PASSWORD,
      host: APP_DB_HOST,
      database: APP_DB_DATABASE,
    },
    pool : {
      min: APP_DB_MIN_POOL,
      max: APP_DB_MAX_POOL,
    },
    acquireConnectionTimeout: APP_DB_TIMEOUT,
    migrations: {
      directory: './migrate',
    },
    seeds: {
      directory: NODE_ENV === 'production' ? './seed/prod' : './seed/dev',
    },
  };
};
