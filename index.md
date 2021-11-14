# Mazeltov

<img
  src='logo.png'
  style='width:200px;margin:0 auto;display:block;'
/>

Mazeltov is an MVC framwork written in Nodejs, PostgreSQL and Redis cache.

## Table of Contents

* [Installing](#installing)
* [Project Layout](#project-layout)
* [Tutorial](#tutorial)

## Installing

To create a new project, say `app` for example, run:

```sh
npx @mazeltov/cli project create app
```

If you are git cloning a project you've already made and want to create local SSL certs and set up .env run this from inside the directory:

```sh
npx @mazeltov/cli project setup
```

Once your project is set up, you'll have to run:

```sh
# run this in one shell (or use -d flag)
docker-compose up

# create necessary database tables and records
npm run migrate
npm run seed
```
Once that's set up, you should be able to visit your site in your browser. You may get a warning about the certificate, but click on "Advanced" an trust it (this is okay for local development).


## Project Layout

* controller - Controllers gather args from http, or cli and pass to the model
* model - Models are responsible for "modeling" business logic and writing to database
* service - Should sending emails/sms be in a model? response caching? logging? Services exist to abstract code outside of controllers so they do not become bloated.
* public - static assets (js, css, static images)
* view - dynamic page templates (pug by default)
* migrate - Database migration files.
* seed - database seed files for static records. Shared seeders go here and are symlinked to seed/dev and seed/prod
  * seed/dev - development seed files like test records
  * seed/prod - production seed files
* rsa - This includes a generated asymmetric key pair for signing JWTs as well as SSL cert key pairs for encryption during local development. DO NOT USE rsa/server.\* for production! These files are gitignored and you are not beholdent to store your keys here in prod (see example.env).

## Tutorial

To start understanding how things are tied together follow this tutorial. We are not going to beat you over the head with a "Concepts" section, as the concepts should (hopefully) be clear from each part.

* [First MVC](#first-mvc)
  * [Model](#model)
  * [Controller](#controller)
  * [View](#view)
  * [Service](#service)
  * [First MVC Conclusion](#first-mvc-conclusion)

* [MVC Improved](#mvc-improved)
  * [Migration](#migration)
  * [Model From Context](#model-from-context)
  * [Route Building](#route-building)
  * [Validation](#validation)
  * [Access Control](#access-control)

### First MVC

#### Model

We will make a trivial MVC (model, view, controller) just to see how the pieces of the system work together. A model is responsible for **modeling** the entities in our applications and reading and writing them to our database.

Add these contents in `model/cat.js`

```js
module.exports = ( ctx = {} ) => {

  const {
    loggerLib,
  } = ctx;

  const logger = loggerLib(`${ctx.SERVICE_NAME}/model/cat`);

  const getCat = async ( args = {} ) => {

    const {
      id,
    } = args;

    logger.info('Get you cat #%s right meow!', id);

    return {
      id,
      name: 'Felix',
    };

  },

  return {
    getCat,
    get: getCat,
  };

};
```

Now to make the model available to your application add it to `./model/index.js`:

```sh
module.exports = ( ctx = {} ) => require('@mazeltov/model')(ctx, [
  'permission',
  'role',
  // omitted for brevity
  'account',
  // put your model at the end.
  'cat'
]);
```

Models are resolved as such:

* A file by that name is looked for in this directory
* Then a file by that name is looked up in @mazeltov/model/<model-name>.js
* You can also pass an array ['name', func] where func is a function similar to the one exported in your cat model. The goal of this is to allow contributed modules to be developed in the future.

A few other important details:

* Models are loaded in order and each one's ctx (context) has a property called `models` that has all previously loaded models (as dependencies).

#### Controller

Every method (called an action) of a model accepts a single paramater; an object called **args**. args is passed to the model by a **controller**. That's it! A controller accepts some kind of `request`, derives value from it, possibly validates the request and offers some access control and passes the args to the model.

Mazeltov's core controllers are http controllers (express based) and cli controllers.

Create a new api controller for the cat model at `./controller/api/cat`

```js
const {
  consumeArgs,
  viewJSON,
} = require('@mazeltov/middleware');

module.exports = ( ctx = {} ) => {

  const {
    models: {
      catModel,
    },
    loggerLib,
  } = ctx;

  const logger = loggerLib(`${ctx.SERVICE_NAME}/controller/api/cat`);

  const router = require('express').Router()

  router.get('/cat/:id', [
    useArgs({
      params: [
        'id'
      ],
      logger,
    }),
    consumeArgs({
      consumer: catModel.get,
      logger,
    }),
    viewJSON({
      logger,
    }),
  ]);

  return router;

};
```
Mazeltov includes its own middleware libraries to solve a variety of issues up front.

Add this to `./controller/api/index.js`

```js
module.exports = (controllers) => controllers.httpController.apiRouters([
  '_middleware',

  'permission',
  [
    'create',
    'update',
    'remove',
    'list',
  ],

  // omitted for brevity

  'cat',

]);
```

Similar to the models index, controllers:

* When the controller is a string with no array following it
  * Checks the immediate directory for your controller file
  * Check @mazeltov/controller/(api|web|cli) for a controller
* When an array follows (with optional object after)
  * A controller is scaffolded from the model with middleware
  * Requires using `modelFromContext` and is covered later

Try visiting 'https://(your-app)/api/cat/10'

### View

After the controller passes args to the model, the model returns:

* A **result** object on success
* An **error** if the model throws an error

The result or the error is rendered by a view

This is done transparently in a way most Node developers would expect:

* For http routes:
  * When the response is JSON, use the viewJSON middleware,
  * When the response is HTML use viewTemplate which finds templates in `view`,
* For CLI routes
  * The result (returned model value) is printed to stdout

In the case of http, result and error are attached to res.locals for templates.

### Service

What about sending e-mails, or caching, 3rd party api requests and other supportive functions that don't directly relate to the entities our application models?

Typically in MVC, this logic can get stuffed into a controller, but it can make the controller cludgy and bloated with rigid code and logic.

Mazeltov's solution to this is services which are just code packages that do supportive functions. These are loaded from the `service` directory in a similar way to models and controllers.

A service can then be injected into a model, or a controller to do whatever it does.

### Conclusion I

And that is the gist of how a mazeltov app is structured. But there is obviously much much more to be done, so we will graduate to using the database, adding access control, and more.

## MVC Improved

In this section we will cover

* Creating migrations to store entities in our database
* Rapidly building models with modelFromContext
* Validation
* Access control (auth)

### Migrate

#### Intro

Migrations are managed by knexjs. Mazeltov core comes with it's own migrations (for auth). Any core migrations are symlinked from `node_modules/@mazeltov/model/migrations/core/*` to your projects `migrate` directory.

You are responsible for ensuring your migrations play nice with core migrations and tamper with them at your own peril (don't do this). Core migrations have to be manually symlinked (but if someone would open an issue/PR for @mazeltov/cli to auto-symlink core migrations with some command that'd be great!)

There is an example migration for an account schema that is yours to edit to your needs. Generally as a rule **If it is not symlinked to core, it's fine to edit**

[KnexJS Docs](https://knexjs.org/)

Run `npm run make-migration createCatTable`

Once that's in place, edit `migrate/(some-date)_createCatTable.js`:

```js
exports.up = function (knex) {
  return knex.schema.withSchema('cat').createTable('cat', (table) => {

    table.increments();

    table.string('name');

    table.string('catSaying');

    table.boolean('isChonky').defaultTo(true);

    table.integer('accountPersonId')
      .references('personId')
      .inTable('account.person')
      .onUpdate('CASCADE')
      .onDelete('CASCADE');

    table.timestamps(true, true);

  });
}

exports.down = function (knex) {
  return knex.schema.withSchema('cat').dropTable('cat');
}
```

Run your migration `npm run migrate`

### Model From Context

And now the fun part, we'll create a model... from context! back in `model/cat.js`

```js
const {
  creator,
  getter,
  updater,
  lister,
  remover,
  modelFromContext,
} = require('@mazeltov/model/lib');

module.exports = ( ctx ) => modelFromContext({
  ...ctx,
  key: 'id',
  entityName: 'cat',
  schema: 'cat',
  selectColumns: [
    [
      'cat',
      [
        'id',
        'name',
        'isChonky',
        'catSaying',
        'accountPersonId',
        'createdAt',
        'updatedAt',
      ],
    ],
    [
      'account',
      [
        'personId',
      ]
    ],
  ],
  createColumns: [
    'name',
    'isChonky',
    'catSaying',
    'accountPersonId',
  ],
  updateColumns: [
    'name',
    'isChonky',
    'catSaying',
  ],
  joins: [
    ['innerJoin', 'account.account AS account', 'account.personId', 'cat.accountPersonId']
  ],
  // query builder for multiple cat search
  onBuildListWhere: {
    like: [
      'catSaying',
      'name',
    ],
    equals: [
      'id',
    ],
  },
}, [
  creator,
  updator,
  getter,
  lister,
  remover,
]);
```

This produces a model with methods:

* create, createCat,
* update, updateCat,
* remove, removeCat,
* get, getCat,
* list, listCat,

### Route Building

Now we can scaffold an API endpoint for all these methods, by changing `controller/api/index.js`

```js
// change this in controller/api/index.js
'cat'

// to
'cat',
[
  'create',
  'list',
  'get',
  'update',
  'remove',
],
```

And now your app will have routes for:

* GET /api/cat/list
* GET /api/cat/:id
* POST /api/cat
* DELETE /api/cat/:id
* PUT /api/cat/:id

These routes:

* Do not have access control (yet!)
* Use, createColumns, updateColumns, and selectColumns for useArgs middleware
* Are great for scaffolding a ton of boiler-plate routes
* If you need more control of middleware you can stick to a file (like we had)

### Validation

We are now going to add validation to our model.

```js
// include cross, which makes a cross product of multiple arrays
const {
  collection: {
    cross,
  },
  validate: {
    isNotEmpty,
    isString,
    isBoolean,
    withLabel,
    withPaginators,
  }
} = require('@mazeltov/util');

const {
  creator,
  getter,
  updater,
  lister,
  remover,
  // include validator action builder
  validator,
  modelFromContext,
} = require('@mazeltov/model/lib');

module.exports = ( ctx ) => modelFromContext({
  ...ctx,
  key: 'id',
  entityName: 'cat',
  schema: 'cat',
  selectColumns: [
    [
      'cat',
      [
        'id',
        'name',
        'isChonky',
        'catSaying',
        'accountPersonId',
        'createdAt',
        'updatedAt',
      ],
    ],
    [
      'account',
      [
        'personId',
      ]
    ],
  ],
  createColumns: [
    'name',
    'isChonky',
    'catSaying',
    'accountPersonId',
  ],
  updateColumns: [
    'name',
    'isChonky',
    'catSaying',
  ],
  joins: [
    ['innerJoin', 'account.account AS account', 'account.personId', 'cat.accountPersonId']
  ],
  // query builder for multiple cat search
  onBuildListWhere: {
    like: [
      'catSaying',
      'name',
    ],
    equals: [
      'id',
    ],
  },
  validators: {
    id: withLabel('Cat id', [
      isNotEmpty,
      isUnsigned,
    ]),
    name: withLabel('Cat name', [
      isNotEmpty,
      isString,
    ]),
    catSaying: withLabel('Cat saying', [
      isNotEmpty,
      isString,
    ]),
    isChonky: withLabel('Is chonky', [
      isBoolean,
    ]),
    accountPersonId: withLabel('Owner', [
      isNotEmpty,
      isString,
    ]),
    ...withPaginators()
  },
}, [
  creator,
  updator,
  getter,
  lister,
  remover,
  // cross produces [[ validator, {...}], [validator, {...}] ...]
  ...cross([ validator ], [
    {
      fnName: 'validateCreate',
      toValidate: [
        'name',
        'catSaying',
        'isChonky',
        'accountPersonId',
      ],
    },
    {
      fnName: 'validateUpdate',
      toValidate: [
        'id',
        'name',
        'catSaying',
        'isChonky',
      ],
      optional: [
        'isChonky',
      ],
    },
    {
      fnName: 'validateGet',
      toValidate: [
        'id',
      ],
    },
    {
      fnName: 'validateRemove',
      toValidate: [
        'id',
      ],
    },
    {
      fnName: 'validateList',
      toValidate: [
        'id',
        'name',
        // ...withPaginators() adds validators for these. These
        // are standard for list actions.
        'page',
        'limit',
      ],
  ]),
]);
```

When building actions (second aray passed to modelFromContext) we can:

* put functions in this array
* or an array with with the function and a ctx (context) override

Here, we use the `cross` function to produce many function, config pairs and each one has it's own fnName property. This allows fields to easily be re-used accross numerous validators.

Now, the controller will check that functions (named validate{action}) exist and adds validateArgs middleware. Try sending a request to '/api/cat/roy' to get a 400 response.

### Access Control

Mazeltov primarily uses JSON Web Tokens for authentication, and internal database tables for authorization. JWTS have data in them called claims, and some data has been standardized into what are called **standard claims**. Most access control relies on a claim called the subject which is usually the person the token was granted for.

Similar to validators, access is controlled creating subjectAuthorizor methods

```
const {
  //...
  subjectAuthorizor,
} = require('@mazeltov/model/lib');

module.exports = ( ctx ) => modelFromContext({
  ...ctx,
  //...
}, [
  creator,
  updater,
  //...
  ...cross([ subjectAuthorizor ], [
    {
      fnName: 'canCreate',
      scoped: true,
      // only use ownershipArgs if the action requires this field.
      ownershipArg: 'accountPersonId',
    },
    {
      fnName: 'canUpdate',
      scoped: true,
      ownershipColumn: 'accountPersonId',
    },
    {
      fnName: 'canRemove',
      scoped: true,
      ownershipColumn: 'accountPersonId',
    },
    {
      fnName: 'canGet',
      scoped: true,
      ownershipColumn: 'accountPersonId',
    },
    // We'll make listing public
  ]),
]);
```

Just like with validation, our bootstrappd controller now sees there is a can(action) method and adds a middleware called `canAccess`

What does this do? Now when an API request is made:

* a middleware called requireAuth will check that there is a valid JWT in authorization header
* canAccess middleware recognizes this is a person based on scopes and looks up the persons permissions from their id
* The permissions and whether the person has an administrative role, is passed to our subjectAuthorizor
* the subjectAuthorizor action throws an error if the permission is not satisfied

#### A Word on Permissions

Mazeltov is permission based. Roles logically organize permissions in meaningful ways, but permissions are always checked for authorization.

Permissions (in access.permission table) use this scheme:

`can (action) [own|any] (entityName)`

Where **own** or **any** exist only for **scoped** permissions (indicated in model by scoped: true). A scoped permission just distinguishes a resource
as one belonging to the requestor, or anyones resource. An unscoped permission means the resource doesn't belong to anyone in particular (e.g. "can list role").

scopes in the context of permissions are not the same a token scope.
