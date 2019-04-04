'use strict'

function buildStructErrorMessage(err) {
  const fields = err.errors.reduce((allErrs, { path, reason, type }) => {
    const fieldName = path.join('.')
    const message = reason || `must be a ${type}`
    return { ...allErrs, [fieldName]: message }
  }, {})

  return {
    error: {
      message: 'Missing or incorrectly formatted data',
      fields,
    },
  }
}

module.exports = ({ response, state, err, msg, options, StructError }) => {
  if (StructError && err instanceof StructError) {
    response.status = 400
    response.body = buildStructErrorMessage(err)
    state.warning = 'Struct validation failure'
    return
  }

  if (msg && options && state.log)
    state.log.warn('Incorrectly passing both msg and options to handleError', { msg, options })

  if (!msg && (!options || (!options[err.code] && !options.defaultMessage))) {
    response.status = 500
    response.body = { error: { message: 'Something broke' } }
    state.err = {
      ...err,
      message: `An error occurrend but handleError was not passed "msg" ${
        options ? `and the passed "options" didn't catch it.` : 'or "options."'
      }. Original error message: ${err.message}`,
    }
    return
  }

  if (msg) {
    response.status = msg.status || 500
    response.body = { error: { message: msg.message || msg } }
    if (msg.code) response.body.error.code = msg.code
    state.err = err
    return
  }

  const option = options[err.code]
  if (option) {
    if (typeof option === 'number') {
      response.status = option
      response.body = {
        error: {
          message: err.message,
          code: err.code,
        },
      }
      if (option >= 500) state.err = err
      else state.warning = err.message
      return
    }

    const { status, isError, message, codeOverride, noCode } = option

    response.status = status
    response.body = { error: { message: message || err.message } }
    if (!noCode) response.body.error.code = codeOverride || err.code

    if (isError) state.err = err
    else state.warning = message || err.message

    return
  }

  response.status = options.defaultMessage.status || 500
  response.body = { error: { message: options.defaultMessage.message || options.defaultMessage } }
  if (options.defaultMessage.code) response.body.error.code = options.defaultMessage.code
  state.err = err
}
