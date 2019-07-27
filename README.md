# API

## buildServer

## handleError

### Arguments

Receives `{ response, state, err, msg, options, StructError }`
* `response`: response object (required)
* `state`: koa state (required)
* `err`: the thrown error (required)
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
* `StructError`: the error class to use for data structure validation checks - an `err instanceof StructError` check will be used on it, and if there is a match, the passed `err` shape is expected to match the shape of [superstruct errors](https://www.npmjs.com/package/superstruct) (optional)

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
