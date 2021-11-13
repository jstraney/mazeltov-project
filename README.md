# Congratulations! (Mazel tov)

Mazeltov is a MVC framework built on Nodejs, PostreSQL and Redis.

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

# create necessary tables and records
npm run migrate
npm run seed
```

## Tutorial

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

## Extending Layout

These are just suggestions for expanding the layout if you had to:

* lib - Standalone libraries (though @mazeltov/util has a lot of coverage for getting things done)

## Adding Custom Code

If this is your project, you can add migrations for new relations with `npm run make-migration <name>`

Seeds can be added with `npm run make-seed <name>`

## Contribute Models/Controllers

If you'd like to write a model or contributed controller just make a separate module exportable as a function that accepts the ctx (context) object. Then, require it in your project like this.

```js
// In controllers
const controllers = require('@mazeltov/controller')(ctx, [
  'cli',
  ['custom', require('my-module')],
]);

// ... see ./controller/index.js

// where route is a method returned in your export.
controllers.customController.route([
  'account',
]);
```

## Optional Setup

If you have `psql` client installed on your machine, you may want to set up
a `.pgpass` file in your home directory. The format for reference is:

```
hostname:port:database:username:password
```

Set permissions for this to 0600!
