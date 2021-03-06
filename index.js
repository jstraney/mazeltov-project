const
fs   = require('fs'),
path = require('path'),
url  = require('url');

let inProject;

const pkgPath = path.resolve(process.cwd(), 'package.json');

if (fs.existsSync(pkgPath)) {
  const pkg = require(pkgPath);
  inProject = pkg.generatedWith === 'mazeltov';
}

const envPath = process.env.APP_ENV_PATH || path.resolve(__dirname, '.env');
const envExists = fs.existsSync(envPath);

const isEntryPoint = process.argv[1] === __filename;

const init = async ( passedCtx = {} ) => {

  isEntryPoint && require('dotenv').config();

  const ctx = {
    ...passedCtx,
    appRoot: __dirname,
    inProject,
    envExists,
    loggerLib: require('@mazeltov/core/lib/logger'),
  };

  const {
    serviceLoader,
    modelLoader,
    controllerLoader,
  } = await require('@mazeltov/core/loader')(ctx, [
    'service',
    'model',
    'controller',
  ]);

  const services = await require('./service')(ctx, serviceLoader);

  const models = await require('./model')({
    ...ctx,
    services,
  }, modelLoader);

  const controllers = await require('./controller')({
    ...ctx,
    services,
    models,
  }, controllerLoader);

  if (isEntryPoint) {
    await controllers.cliControllers.prepareAndRun(process.argv.slice(2));
  } else {
    return {
      ...ctx,
      services,
      models,
      controllers,
    }
  }

};

if (isEntryPoint) {
  (async () => await init())();
}

module.exports = init;
