'use strict'

const { StructError } = require('superstruct')

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

/**
 * Pass either but not both:
 *  msg:
 *    { message: String, status: Number (optional, 500 default), code: String (optional) }
 *    OR
 *    String (returns 500)
 *  OR
 *  options: [
 *     // If provided, [codeOverride] overrides optionCode
 *    [optionCode: String to match on err.code, status: String, { isError: Bool, [codeOverride]: message } = {}],
 *    ...
 *    defaultMessage (returns 500)
 *  ]
 *
 * Standard errors have the format:
 * {
 *   error: {
 *     message: String
 *     code: String (err.code/codeOverride) // Not sent for generic errors
 *   }
 * }
 *
 * Validation (struct) errors have the format:
 * {
 *   error: {
 *     message: String)
 *     fields: {
 *       [fieldName]: validation error message,
 *       ...
 *     }
 *   }
 * }
 */
module.exports = ({ response, err, msg, options = [], state }) => {
  if (msg && options.length)
    state.log.warn('Incorrectly passing both msg and options to handleError', { msg, options })

  if (err instanceof StructError) {
    response.status = 400
    response.body = buildStructErrorMessage(err)
    state.warning = 'Struct validation failure' // eslint-disable-line no-param-reassign
    return
  }

  if (msg) {
    response.status = msg.status || 500
    response.body = { error: { message: msg.message || msg } }
    if (msg.code) response.body.error.code = msg.code
    state.err = err // eslint-disable-line no-param-reassign
    return
  }

  // eslint-disable-next-line array-callback-return
  options.some(option => {
    if (Array.isArray(option)) {
      const [optionCode, status, { isError, ...optionOverride } = {}] = option
      if (err.code === optionCode) {
        const [[code, message]] = Object.keys(optionOverride).length
          ? Object.entries(optionOverride)
          : [[err.code, err.message]]

        response.status = status
        response.body = { error: { message, code } }

        /* eslint-disable no-param-reassign */
        if (isError) state.err = err
        else state.warning = message
        /* eslint-enable */

        return true
      }
      return false
    }

    response.status = 500
    response.body = { error: { message: option } }
    state.err = err // eslint-disable-line no-param-reassign
  })
}
