# Who Is This For?
I made this for myself as I spin up new servers for solo projects. So it's a bit opinionated.

It's served me well so I thought I'd make it available to anyone who wants it. Also, I wanted access to it as an NPM package, and splurging to make this lib private felt unnecessary.

It uses Koa under the hood because I like how lightweight it is, so this is also for people who are not wed to Express.

# What Is Its Purpose?
* Building an extendable server with some default middleware, and an optional logging middleware (`buildServer`).
* Building routes that you pass to the server builder (`buildRouter`).
* Handling errors with a syntax that is self-documenting (`handleError`).

# Core Concepts
* Information is persisted across a request's lifespan via the request's `ctx.state` object.
  * When the core `buildServer` function's default logging middleware is left enabled and the optional `handleError` fn is used, you will find that your response status is reflected in your logging level (info, warn, error), as well as some other niceties. This is thanks to information that is persisted to `ctx.state.warning` and `ctx.state.err`.
* Every request has a unique UUID assigned to it, stored in `ctx.state.id`.
* Every request's start time is stored in `ctx.state.start` as a `Date.now()` value.
* It should be simple to tell what types of responses you'll get from a route, so the `handleError` is intended to receive arguments in a way that is relatively self-documenting. Unless you specifically specify otherwise, the error message from a thrown error will be returned in the server response body.
* *I assume that every request body is either empty or an object.*
* *I assume that every response body is either empty or an object.*

# API

## buildServer

### Arguments

Receives `{ name, routes, port, beforeStartup, noLogging, allowCors, middleware }`
* `name`: String. Server name for use in logging - even if you don't use logging middleware, `buildServer` returns an object that includes a `log` fn for you to call, which uses this name. (required)
* `routes`: Array[buildRouter()]. Array of routes to use built with the `buildRouter` API fn. (required)
* `port`: Number. The port for the server to listen on. (required)
* `beforeStartup`: Function(log) => Promise. Anything you want to happen before we start listening on a port, such as connecting to a DB. It must be a function that returns a Promise. The function is passed the `log` for use before the server starts listening. (optional)
* `noLogging`: Bool. Whether you want each request to be logged via the logging middleware. (optional, defaults false)
* `allowCors`: Bool. Whether you want to allow CORS for the server. (optional, defaults false)
* `middleware`: Array[fn()]: Array of middleware you would like to use. (optional)
* `requestBodyMaxLoggingLen`: Number: The max length of the request body that you want to log - anything afterwards is truncated. Only matters if `noLogging` is not set. (optional, defaults to 500)
* `responseBodyMaxLoggingLen`: Number: The max length of the response body that you want to log - anything afterwards is truncated. Only matters if `noLogging` is not set. (optional, defaults to 500)

### Returns
Returns `{ app, log }`
* `app`: Koa server. This way you can do anything else you want to the server.
* `log`: Bunyan logger. This is used to generate the request/response logging middleware, but is also provided here for you to call as you want.

### Logging In Depth
When the logging middleware is enabled, each request gains several features:
* Access to a logger which automatically includes the id of the request at `ctx.state.log`. It enables `ctx.log.info`, `ctx.log.warn`, and `ctx.log.error` calls from within routes.
* Logging an `info` output on successful requests, a `warn` on requests with `ctx.state.warning`, and an `error` on requests with `ctx.state.err`. Because of this, I recommend using this middleware in conjunction with the `handleError` function that is also exposed by this library, as it leverages the paradigm.
* Logging the following information upon completion of every request:
  * `responseStatus`: Number. The response status.
  * `method`: String. The request method.
  * `url`: String. The request url.
  * `body`: String or Object. The request body.
    * Top-level `token` and `password` keys are logged as `*******`.
    * Because request bodies can get long, logs of them are truncated to 500 characters by default. You can override this on a per-request basis with `ctx.state.requestBodyMaxLoggingLen`, or for all requests with the `requestBodyMaxLoggingLen` argument as described above.
  * `ip`: String. The IP of the request.
  * `responseTime`: Number. The response time in ms.
  * `responseBody`: Object or Undefined. The response body.
    * Top-level `token` and `password` keys are logged as `*******`.
    * Because response bodies can get long, logs of them are truncated to 500 characters by default. You can override this on a per-request basis with `ctx.state.responseBodyMaxLoggingLen`, or for all requests with the `responseBodyMaxLoggingLen` argument as described above.
  * `id`: String. The UUID of the request.

## buildRouter

### Arguments

Receives `String: route prefix OR koaRouterOptions` - [koaRouterOptions](https://www.npmjs.com/package/@koa/router)

### Returns

Returns an instance of a `Router` for you to apply `router.post`, `router.get`, etc routes to.

## handleError

### Arguments

Receives `{ response, state, err, msg, options, StructError }`
* `response`: Object. Koa response. (required)
* `state`: Object. Koa state. (required)
* `err`: Error. The thrown error. (required)
* `msg`:
```
{
  message: String (non-empty),
  status: Number (optional, 500 default),
  code: String (optional)
}

OR

String (returns 500)
```
* `options`:
```
{
  [optionCode]:
    {
      status: Number,
      isError: Bool (optional, if true state.err = err, else state.warning = (message || err.message)),
      message: String (optional, overrides err.message as returned error.message),
      code: String (optional, overrides optionCode as returned error.code),
      noCode: Bool (optional, when true no error.code is returned)
    },

    OR

    Number (status to return, which means the thrown err.message and err.code are sent; if >= 500, state.err = err)
  ...
  defaultMessage: same as msg
}
```
* `StructError`: StructError. The error class to use for data structure validation checks - an `err instanceof StructError` check will be used on it, and if there is a match, the passed `err` shape is expected to match the shape of [superstruct errors](https://www.npmjs.com/package/superstruct). (optional)

Pass either but not both `msg` and `options`.
* If neither is provided then a 500 is sent automatically with a generic error.
* If only `options` are passed, and the thrown `error.code` key does not match any options (`options[error.code]`), and no `options.defaultMessage` is passed, then a 500 is sent automatically with a generic error.
* If both are provided then a warning is logged and the `msg` is used.

### Responses
Standard errors have the format:
```
{
  error: {
    message: String
    code: String (options[err.code].code || err.code) // Not sent for generic errors, or when options[err.code].noCode is passed
  }
}
```

Validation (struct) errors have the format:
```
{
  error: {
    message: String
    fields: {
      [fieldName]: validation error message,
      ...
    }
  }
}
```

# Everything In Action

## Define Routes
```
const { buildRouter } = require('effectsloop-server-utils')

const handleError = require('./handleError')

const router = buildRouter('/users')

router.post('/sign-up', async ({ request, response, state }) => {
  try {
    // route logic here
  } catch (err) {
    const { validationErrors } = users.signUp

    // The codes for errors that could be thrown, and the statuses to send back for those errors
    // 4xx errors will log a warning, and the message from the error will be sent in the
    // the response body as { error: { message: error message } }
    // The defaultMessage logs an error, and the response body is { error: { message: defaultMessage } }
    const options = {
      [validationErrors.EMAIL_TAKEN]: 409,
      [validationErrors.USERNAME_TAKEN]: 409,
      defaultMessage: 'Something broke while attempting to sign up',
    }

    handleError({ response, state, err, options })
  }
})

router.post('/delete-account', async ({ request, response, state }) => {
  try {
    // route logic here
  } catch (err) {
    // No route-specific errors are anticipated here, so any error results in a 500
    // with { error: { message: msg } }
    handleError({ response, state, err, msg: 'Something broke while attempting to delete account' })
  }
})

module.exports = router
```

## Extend handleError If Needed

```
const { handleError } = require('effectsloop-server-utils')
const { StructError } = require('superstruct')

const { DBError, ValidationError } = require('../lib/Errors')
const { users } = require('../repo')

module.exports = ({ response, state, err, msg, options }) => {
  // Handle route-agnostic DBErrors here so that you can avoid defining this handling in multiple routes
  if (err instanceof DBError) {
    response.status = 500
    response.body = { error: { message: 'An error occured in the DB', code: 'dbError' } }
    state.err = err // eslint-disable-line no-param-reassign
    return
  }

  // Handle route-agnostic ValidationErrors here so that you can avoid defining this handling in multiple routes
  const { INVALID_EMAIL, DEACTIVATED_ACCOUNT, UNVERIFIED_ACCOUNT } = users.genericValidationErrors
  if (
    err instanceof ValidationError &&
    [INVALID_EMAIL, DEACTIVATED_ACCOUNT, UNVERIFIED_ACCOUNT].includes(err.code)
  ) {
    const { code, message } = err
    response.status = code === INVALID_EMAIL ? 401 : 409
    response.body = { error: { message, code } }
    state.warning = 'Generic user validation failed' // eslint-disable-line no-param-reassign
    return
  }

  // Handle route-specific errors as you've defined in each route
  handleError({ response, state, err, msg, options, StructError })
}
```

## Create The Server

```
const { buildServer } = require('effectsloop-server-utils')

const connectToDB = require('./connectToDB')
const userRoutes = require('../userRoutes')

const { SERVER_PORT } = process.env

const connectToDB = log = new Promise((resolve, reject) => {
  // DB connection logic here
  db.on('error', err => {
    log.error({ err }, 'Connection error')
    reject()
  })

  db.on('open', () => {
    log.info('Connected to the DB!')
    resolve()
  })
})

// The only unused option here is noLogging
const { app, log } = buildServer({
  name: 'user-service',
  routes: [userRoutes],
  port: SERVER_PORT,
  allowCors: true,
  requestBodyMaxLoggingLen: 300,
  responseBodyMaxLoggingLen: 400,
  beforeStartup: connectToDB,
})

module.exports = { app, log }
```
