# API

## buildServer

## handleError

### Arguments

Receives `{ response, state, err, msg, options }`
* `response`: response object
* `state`: koa state
* `err`: the thrown error
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
* options:
```
{
  [optionCode]:
    {
      status: Number,
      isError: Bool (optional, determines whether the err is added to state.error state.warning or state.error),
      message: String (optional, overrides err.message as returned error.message),
      code: String (optional, overrides optionCode as returned error.code),
      noCode: Bool (optional, when true no error.code is returned)
    },

    OR

    Number (status to return, which means the thrown error.message is sent; if >= 500, logs as an error)
  ...
  defaultMessage: same as msg
}
```

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
    code: String (err.code/codeOverride) // Not sent for generic errors
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
