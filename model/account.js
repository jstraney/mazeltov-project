const {
  collection: {
    cross,
  },
  validate: {
    isString,
    isNotEmpty,
    isRegExp,
    isEmailExpression,
    withLabel,
    withPaginators,
  },
  error: {
    ConflictError,
  },
} = require('@mazeltov/util');

const {
  modelFromContext,
  creator,
  updater,
  lister,
  getter,
  remover,
  validator,
  subjectAuthorizer,
} = require('@mazeltov/model/lib');

module.exports = ( ctx = {} ) => {

  const {
    db,
    models: {
      personModel,
      personRoleModel,
    },
  } = ctx;

  const iface = modelFromContext({
    ...ctx,
    key: 'personId',
    entityName: 'account',
    schema: 'account',
    selectColumns: [
      [
        'account',
        [
          'personId',
          'serviceLevel',
        ],
      ],
      [
        'person',
        [
          'email',
          'isEmailVerified',
          'emailVerificationToken',
          'username',
          'mobilePhoneCountryCode',
          'mobilePhoneAreaCode',
          'mobilePhoneNumber',
        ],
      ],
      [
        'service',
        [
          // you can alias selected columns
          ['label', 'serviceLabel'],
          ['description', 'serviceDescription'],
        ],
      ]
    ],
    joins: [
      // cross schema joins have to be raw but they work!
      ['joinRaw', 'LEFT JOIN access.person AS person ON person.id = account.person_id'],
      ['innerJoin', 'service', 'service.level', 'account.serviceLevel'],
    ],
    createColumns: [
      'personId',
      'serviceLevel',
    ],
    updateColumns: [
      'fullName',
      'email',
      'mobilePhoneCountryCode',
      'mobilePhoneAreaCode',
      'mobilePhoneNumber',
    ],
    validators: {
      email: withLabel('Email', [
        isNotEmpty,
        isString,
        isEmailExpression,
      ]),
      fullName: withLabel('Full name', [
        isNotEmpty,
        isString,
      ]),
      password: withLabel('Password', [
        isNotEmpty,
        isString,
        [
          isRegExp,
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
          [
            'Password must have eight characters',
            'at least one uppercase letter',
            'one lowercase letter',
            'one number and one special character'
          ].join(', '),
        ],
      ]),
    },
  }, [
    getter,
    creator,
    updater,
    remover,
    ...cross([ subjectAuthorizer ], [
      {
        fnName: 'canGet',
        scoped: true,
        ownershipArg: 'personId',
      },
      {
        fnName: 'canUpdate',
        scoped: true,
        ownershipArg: 'personId',
      },
      {
        fnName: 'canRemove',
        scoped: true,
        ownershipArg: 'personId',
      },
    ]),
    ...cross([ validator ], [
      {
        fnName: 'validateCreate',
        toValidate: [
          'email',
          'password',
          'fullName',
        ],
      },
    ]),
  ]);

  /**
   * This will get the account but still retrieve the
   * person record if there is no service account
   * (usually the case with an admin). This would be simpler
   * with direct access to SQL and right joins...
   */
  const get = async ( args = {} ) => {
    const {
      personId,
    } = args;

    const account = await iface.get({ personId });

    if (account) {
      account.hasAccount = true;
      return account;
    }

    return personModel.get({ id: personId })
      .then((result) => {
        result.hasAccount = false;
        return result;
      });

  };

  // if you need custom logic, or to transactionalize a model method,
  // the way to do this is the decorator pattern
  const create = async ( args = {} ) => {

    const {
      email,
      fullName,
      password,
      serviceLevel,
    } = args;

    const trx = await db.transaction();

    try {

      const person = await personModel.create({
        email,
        username: email,
        fullName,
        password,
      }, trx);

      await personRoleModel.create({
        personId: person.id,
        roleName: 'customer',
      }, trx);

      const account = await iface.create({
        personId: person.id,
        serviceLevel: 0,
      }, trx);

      await trx.commit();

      return account;

    } catch (error) {
      await trx.rollback();
      // we may get a conflict error on person record so we
      // just change the message here
      if (error.constructor === ConflictError) {
        error.message = 'This account already exists';
      }
      throw error;
    }

  };

  const update = async ( args = {} ) => {

    const {
      email,
    } = args;

    const trx = await db.transaction();

    try {

      const person = await personModel.get({email});

      await personModel.update({
        ...args,
        id: person.id,
        email,
        username: email,
      }, trx);

      /**
       * update any added fields to account.
       */

      await trx.commit();

    } catch (error) {
      await trx.rollback();
      throw error;
    }

  };

  return {
    ...iface,
    create,
    createAccount: create,
    update,
    updateAccount: update,
    get,
    getAccount: get,
  };

};
