# Mazeltov

<img
  src='logo.png'
  style='width:200px;margin:0 auto;display:block;'
/>

Mazeltov is an MVC framwork written in Nodejs, PostgreSQL and Redis cache.

## Table of Contents

* [New Project](#new-project)
* [Project Layout](#project-layout)
* [Tutorial](#tutorial)

## New Project

To create a new project, say `app` for example, run:

```sh
npm i -g @mazeltov/core

# Follow the prompts after running command below. You can change it later!
mazeltov project create app
cd app
```

Mazeltov projects come with a dockerfile to use for local development but you are not required to use this for a production environment. In fact, we have a guide on [going to production](#going-to-production).

```sh
# run this in a separate shell (or add -d flag to end)
docker-compose up
```

A mazeltov module is a nodejs module that follows a semantic structure as described under [making a module](#making-a-module). The added benefit here is that the modules can contain their own schemas that are migrated on install and provide isolated features, endpoints and so-on. To run installation prompts, migrations and other crucial steps, the mazeltov cli is used instead of npm. Only core is required to use Mazeltov, but @mazeltov/access is used in this tutorial.

```
mazeltov module install core
# This one will prompt you and the defaults should be good. Make an admin user and write down the password generated or pick one that you'd like.
mazeltov module install @mazeltov/access
```

**SERIOUSlY:** write down the admin password generated above or make it 1234, you'll need to sign in later.

## Project Layout

These are the semantics followed for every project and for every mazeltov contributed module.

* controller - Controllers gather args from http, or cli and pass to the model
* model - Models are responsible for "modeling" business logic and writing to database
* service - Should sending emails/sms be in a model? response caching? logging? Services exist to abstract code outside of controllers so they do not become bloated. Services are also where most hooks are registered.
* public - static assets (js, css, static images)
* view - dynamic page templates (pug by default)
* migrate - Database migration files.
* seed - database seed files for static records. Shared seeders go here and are symlinked to seed/dev and seed/prod
  * seed/dev - development seed files like test records
  * seed/prod - production seed files
* rsa - This includes a generated asymmetric key pair for signing JWTs as well as SSL cert key pairs for encryption during local development. DO NOT USE rsa/server.\* for production! These files are gitignored and you probably shouldn't store your keys here in prod (see example.env).
* lib - Standalone libraries

## Configuring Modules

When you ran `mazeltov module install @mazeltov/access` the following happened.

* npm fetched @mazeltov/access
* anything under `view` in this module was symlinked (so the views can be extended)
* any migration under `migrate` was run (your database should be up when you run this command)
* an `install.js` file was found in the `service` directory and was run.

But there are still some things that Mazeltov does not do:

* Add services, models and controllers from the contributed module (we will do this next)
* Run `mazeltov module install` on dependencies

So to add the services, models and controllers add the following to the end of the array passed to the service loaders.

**To service/index.js**
```js
  require('@mazeltov/access/service'),
```

**To model/index.js**
```js
  require('@mazeltov/access/model'),
```

**To controller/web/index.js**
```js
  require('@mazeltov/access/controller/web'),
```

**To controller/api/index.js**
```js
  require('@mazeltov/access/controller/api'),
```

**To controller/cli/index.js**
```js
  require('@mazeltov/access/controller/cli'),
```

Another limitation of mazeltov is that it does not seemlessly reload your app after you run install and update these files.

## Tutorial

To start understanding how things are tied together follow this tutorial. We are not going to beat you over the head with a "Concepts" section, as the concepts should (hopefully) be clear from each part.

* [First MVC](#first-mvc)
  * [Migration](#migration)
  * [Model](#model)
  * [Controller](#controller)
  * [View](#view)
  * [Service](#service)
  * [First MVC Conclusion](#first-mvc-conclusion)
  * [Model From Context](#model-from-context)
  * [Route Building](#route-building)
  * [Validation](#validation)
  * [Access Control](#access-control)

## First MVC

### Migration

Migrations in Mazeltov use knexjs as their foundation but use a different set of tables.

Additionally, each migration is separated by a moduleName column to easier separate migrations into schemas.

Therefore:

* You should put your migrations in a schema
* You should only use FK constraints on third party schemas if you accept that changes to their schemas could break yours

To make a migration for your project

`mazeltov migration make createCatTable`

You'll see that it created a migration in your project, edit this file:

```
exports.up = async (trx) => {
  await trx.raw('CREATE SCHEMA IF NOT EXISTS cat;');
  await trx.schema.withSchema('cat')
    .createTable('cat', (table) => {
      table.text('name').primary();
      table.text('saying');
    });
};

exports.down = async (trx) => {
  await trx.schema.withSchema('cat')
    .dropTable('cat');
};
```

**Notice:** You must await your queries otherwise they may not complete causing incomplete queries.

By default, your migrations will be wrapped in a transaction (so no need to call trx.commit or trx.rollback)

This is one of many reasons postgres was chosen as the default RDBMS is because MySQL doesn't allow this for schema changes.

Once that's in place, try `mazeltov migration run`

To roll back all changes in last migration, try `mazeltov migration rollback`

Defining your models

### Seeders

Lets add some test records

A seeder will populate your database with test records. Seeders are split between dev and prod subdirectories. You don't have to use production seeders and can add records in migrations if that works best for you. Seeders will run in alphabetical order so if an order is preferred you can rename them with dates or numerical prefixes.

`mazeltov seed make testRecords`

edit the seeder at ./seed/dev/testRecord

```
module.exports = async (trx) => {
  await trx('cat').withSchema('cat').insert([
    {
      name: 'Ron',
      saying: 'Thats meee!',
    },
    {
      name: 'Wendy',
      saying: 'Its cat time...',
    },
    // add more!
  ])
  .onConflict('name')
  .merge();
}
```

**Notice**: It's also important to await queries in seeders so they complete.

### Services

Services are the foundation of mazeltov. If your code doesn't *model* something
or *control* input to the model, there's a good chance that a *service* is the
right place for it.

Some things that come included in core that are wrapped in up services:

* The hook system
* Database access
* Caching
* Sending e-mails
* Application settings (both in .env and database)
* Migration and seeder management
* Route definition and retrieval

All of this messy logic is abstracted away in services which get injected into models.
Models are then injected into controllers.

Services are loaded using loaders, and each loader has a type. *models* and *controllers*
are technically a type of *service*. When a service is simply used to get a job done we
say it is a *basic service*.

A lot of heavy lifting and pluggability is handled by a hookService loaded by core. Try this just as an example:

```js
// ./service/test.js
module.exports = ( ctx ) => {

  const {
    services: {
      hookService: {
        onRedux,
      },
    },
  } = ctx;

  onRedux('entityInfo', (entities) => {
    console.log('%o', entities);

    return entities;
  });

  return {
    example: (a) => console.log('testing! %o', a),
  };

};
```

Then add this

```js
// ./service/index.js
  'test',
])
```

You'll see this loader pattern (like in service/index.js). The way loaders work is that each service instance is loaded in order and becomes accessible to the previous one. If we made a `testTwo.js` file under `./service` and added it's name to the service/index.js file after 'test', it would have access to the 'testService' under the 'services' context object.

Redux is short for reduce. It is absolutely important to always return something from a reducer or else you will get warnings and your code will most likely break.

### Model

At the end of the day, the model is just a collection of methods that accept an object
called args (passed from controller) and return a another object.

```js
module.exports = ( ctx ) => {

  const {
    services: {
      dbService: db,
    },
  } = ctx;

  const get = async ( args = {} ) => {

    const {
      name,
    } = args;

    return db('cat')
      .withSchema('cat')
      .where({name});

  };

  return {
    get,
    // if you want to use automatic controllers, you need to assign properties here
    // this is not required if you are building your routes yourself.
    _entityInfo: {
      entityName: 'cat',
      schema: 'cat',
      key: ['name'],
    }
  };

}
```

### Model Shorthand

There is an automagic way to bootstrap your models using schema information autoloaded by
the core modelService.

This is a minimum CRUD model. This variable `ctx` is short for context and it
is important to fill it in along with other properties of the model. the entityName
and schema are mandatory.

The result is an an object with a method of get, create, update, remove and list. Each
method accepts an object called **args** and returns a **result**

The shorthand below is a quick way to produce these methods. The strings are resolved to actions provided by onRedux('entityAction')

```js
// ./model/cat.js
const {
  modelFromContext,
} = require('@mazeltov/core/lib/model');

module.exports = async ( ctx ) => modelFromContext({
  ...ctx,
  entityName: 'cat',
  schema: 'cat',
  selectColumns: [
    'name',
    'saying',
  ],
  createColumns: [
    'name',
    'saying',
  ],
  updateColumns: [
    'saying',
  ],
  onBuildListWhere: {
    equals: [
      'name',
    ],
    like: [
      'saying'
    ],
  },
}, [
  'get'
  'create',
  'update',
  'remove',
  'list',
]);

```

Then add this to `./model/index.js`

```js
module.exports = (ctx, modelLoader) => modelLoader(ctx, [
  /* exisitng code ... */
  'cat',
]);
```

Mazeltov will look for a file in your model directory called 'cat'. If it can't find it,
it will try to load a core mazeltov file in the same place. You can also put a function
here that accepts the ctx and returns the model (such as we did for @mazeltov/access)

### Controller

Just like you can add 'cat' to the model/index.js file, you can add this to `./controller/web/index.js`, `./controller/api/index.js`, and `./controller/cli/index.js` along with localized files in each called 'cat.js'. Here are some basic examples:

```js
// ./controller/web/cat.js
const {
  useArgs,
  consumeArgs,
  viewTemplate,
} = require('@mazeltov/core/lib/middleware');

const {
  webController,
} = require('@mazeltov/core/lib/controller');

module.exports = ( ctx ) => {

  const {
    models: {
      catModel,
    },
  } = ctx;

  return webController('cat', ctx)
    .get('get:cat.cat', [
      useArgs, {
        params: ['name'],
      },
      consumeArgs, {
        consumer: catModel.get,
      },
      viewTemplate, {
        template: 'cat/view'
      },
    ])

};
```

```js
// ./controller/api/cat.js
const {
  useArgs,
  consumeArgs,
  viewJSON,
} = require('@mazeltov/core/lib/middleware');

const {
  apiController,
} = require('@mazeltov/core/lib/controller');

module.exports = ( ctx ) => {

  const {
    models: {
      catModel,
    },
  } = ctx;

  return apiController('cat', ctx)
    .get('get:cat.cat', [
      useArgs, {
        params: ['name'],
      },
      consumeArgs, {
        consumer: catModel.get,
      },
      viewJSON
    ])

};
```

```js
// ./controller/cli/cat.js
module.exports = ( ctx ) => {

  const {
    models: {
      catModel,
    },
  } = ctx;

  return {
    'cat get': {
      consumer: catModel.get,
      options: [
        { name: 'name', type: String, defaultOption: true },
        { name: 'saying', type: String },
      ],
    }
  };

};
```

Now try `mazeltov cat get --help` from the command line.

### Controller Shorthand

The controller is responsible for passing off parts of the request to the model. If you
are using the modelFromContext helper, you can define your routes using this short-hand
syntax. To use the shorthand syntax, you **MUST** have an \_entityInfo property on the exported model.

```js
// ./controller/web/index.js
module.exports = (ctx, webControllerLoader) => webControllerLoader(ctx, [
  /* exisitng code ... */
  'cat',
  [
    'list',
    'create',
    'get',
    'update',
    'remove',
  ],
]);
```

This short-hand form does the following:

* Looks for a loaded model called *catModel*
* Checks for methods with these names
* Builds out an **webHttpController** (built with express)
* core hooks and reducers allow you and other module developers to hook into how these are generically built for any given resource (if you're interested in a deep dive, check out the core webController service)

If we omitted the array and just passed a string, we can define a file called `cat.js` in the
`./controller/web` directory like we did for our model. Passing an object after the array as
a configuration object is also permissible for this loader. It is possible to define your own
kinds of loaders and even extend them into sub-types (like controllers have web, api and cli).

Because HTML forms support only GET and POST, each web route follows these rules

* uri is the same for GET and POST (as defined in reducers in webController service)
* there are not different model methods (like "edit", "new"), rather, the "get" model method is used
  to fetch the result for the create form when the GET HTTP method is used and the "create" model
  method is used when POST is sent.

You should see the routes printed out to console with DEBUG logging.

### View

After the controller passes args to the model, the model returns:

* A **result** object on success
* An **error** if the model throws an error

The result or the error is rendered by a view

In the case of http, result and error are attached to res.locals for templates.

Using the **auto-loaded controller** style above, these are the pug templates you
can use for your cat resource

* `./view/cat/index.pug` for **list**
* `./view/cat/view.pug` for **get**
* `./view/cat/edit.pug` for **update**
* `./view/cat/remove.pug` for **remove**
* `./view/cat/new.pug` for **create**

#### List View

We're going to be making a lot of forms and pages so we'll re-use some of
the menus by registering them in a service.

```js
// ./service/appMenu.js
module.exports = ( ctx ) => {

  const {
    services: {
      menuService: {
        registerMenus,
      },
    },
  } = ctx;

  // Each property is a menu id (just has to be unique). Each
  // item has a routeId as it's key and an array with the readable label
  // and permission ACLs tied to the link.
  registerMenus({
    // We'll use this as the top-level menu
    'list:cat.cat:primary': {
      items: {
        'list:cat.cat': ['All Cats', ['can list cat']],
        'create:cat.cat' : ['New Cat', ['can create cat']],
      },
    },
    // This is the localized menu for each record
    'list:cat.cat:local': {
      items: {
        'update:cat.cat': ['Edit', ['can update cat']],
        'remove:cat.cat': ['Remove', ['can remove cat']],
        'get:cat.cat': ['View', ['can get cat']],
      },
    },
  });

}
```

```js
// ./service/index.js
  /*... put this at end of loaded services*/
  'appMenu',
]);
```

**list** actions will use a template called "index.pug" by default. So the
following is added to the `./view/cat/index.pug path`

```pug
// ./view/cat/index.pug
extend /layout/page

block content

  h1 Cats

  +menu('list:cat.cat:primary').inline.primary

  +form('All Cats').ui-frame

    // this builds out a paginated table for us
    +result-table(result, [
      ['name', 'Cat Name'],
      ['saying', 'Cat Saying'],
      ['actions', 'Actions', { menu: 'list:cat.cat:local' }],
    ])
```

Core includes a variety of mixins to make building pages faster but it's just pug at the end of the day. Any pug include or path beginning with a leading forward slash starts from the ./view directory. When a module is installed and has a view directory, it's views are symlinked to your project.

Some view globals of interest:

* result
* error
* session
* gate
* request
* args
* csrfToken
* nonce

#### New View

```pug
// ./view/cat/new.pug
extends /layout/page

block content

  +menu('list:cat.cat:primary').inline.primary

  +form('New Cat')(method='post').ui-frame.med-width

    label(for='name').required Cat Name

    +input(
      id='name'
      name='name'
      type='text'
    )

    label(for='saying').required Cat Saying

    +input(
      id='saying'
      name='saying'
      type='text'
    )

    div.actions
      input(type='submit' value='Create Cat')
```

#### Edit View

```pug
// ./view/cat/edit.pug
extends /layout/page

block content

  +menu('list:cat.cat:primary').inline.primary

  +form('Edit Cat')(method='post').ui-frame.med-width

    label(for='saying') Cat Saying

    +input(
      id='saying'
      name='saying'
      type='text'
      value=result.saying
    )

    div.actions

      input(type='submit' value='Update Cat')
```

#### Remove View

```pug
// ./view/cat/remove.pug
extends /layout/page

block content

  +menu('list:cat.cat:primary').inline.primary

  +form('Remove Cat')(method='post').ui-frame.med-width

    input(type='hidden' value=result.name)

    p.form-prompt.
      The cat <strong>#{result.name}</strong> will be permanently removed

    div.actions
      input(type='submit' value='Remove Cat')
```

### Validation

Validators should reside on your model and follow the semantic naming convention of 'validate{Action}' in camel case.

If no validator method is found on the model, no validation is applied automatically when using the controller short-hand.

However, there is a validateArgs middleware which could be used if you're writing your controller manually:

```
// ./controller/api/cat.js
const {
  validate: {
    isNotEmpty,
    isString,
    withLabel,
  },
} = require('@mazeltov/core/lib/util');

const {
  // ...
  validateArgs,
} = require('@mazeltov/core/lib/middleware');

// ...

  return apiController('cat', ctx)
    .get('get:cat.cat', [
      useArgs, {
        params: ['name'],
      },
      validateArgs, {
        // You can pass validators to controller directly
        validate: {
          name: withLabel('Cat name', [
            isNotEmpty,
            isString,
          ]),
        },
        // OR: do this. not both though
        validator: catModel.validateGet,
      },
      consumeArgs, {
        consumer: catModel.get,
      },
      viewJSON
    ]);
```
Because all controllers should normalize input into an object called `args`, putting the validator in the model may be most practical. Some may feel more strongly about putting it each controller.

### Access Control

**NOTE:** Everything in this section relies on @mazeltov/access to be installed. If you want to write your own access control, you are welcome to, just do your own research. It could be for your use case you only need opaque tokens and not JWTs or want to run an local API behind a firewall without auth. Core Mazletov does not make these assumptions for you.

Some of this may be moved to the @mazeltov/access project in the future and linked.

Mazeltov primarily uses JSON Web Tokens for authentication, and internal database tables for authorization. JWTS have data in them called claims, and some data has been standardized into what are called **standard claims**. Most access control relies on a claim called the subject which is usually the person the token was granted for.

Similar to validators, access is controlled creating subjectAuthorizor methods.

```
const {
  collection: {
    cross,
  },
} = require('@mazeltov/core/lib/util');

const {
  //...
  subjectAuthorizor,
} = require('@mazeltov/core/lib/model');

module.exports = ( ctx ) => modelFromContext({
  ...ctx,
  //...
}, [
  'create',
  'update',
  //...
  ...cross([ 'canAccess' ], [
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

For each method produced in the cross product above, it generates a method with the respective **fnName**. We can hard code a subjectAuthorizor method like this:

```js
const {
  error: {
    ForbiddenError,
  },
} = require('@mazeltov/core/lib/util');

// ...

const canGet = ( args ) => {
  // these properties here are set internally and should NEVER be
  // allowed to be set by useArgs or sent in by the user.
  const {
    _subject = null,
    _scopes = [],
    _subjectPermissions = {},
    _subjectIsAdmin = false,
  } = args;

  // do your custom logic here
  if (_subjectIsAdmin) {
    return true;
  }

  if (_subjectPermissions['can get cat']) {
    retrun true;
  }

  throw new ForbiddenError('Hey! No cat for you');

};
```

But special care has been taken to make the generated functions in the first example generic. You may want to just use them as is and if you have very special business logic (subscription limits, checking if user A has approved user B's access), you may want to just check this in the model's action and throw an error (which is okay too as long as the error is typed to the status code you want to return).

Just like with validation, our bootstrappd controller now sees there is a can(action) method and adds a middleware called `canAccess`. If we build the controller ourselves, we just pass this as a property called `checkMethod`.

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
