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

// Pass either but not both:
//  msg: { status, message } || String
//  options: []
module.exports = ({ response, err, msg, options = [], state }) => {
  if (err instanceof StructError) {
    response.status = 400
    response.body = buildStructErrorMessage(err)
    state.warning = 'Struct validation failure' // eslint-disable-line no-param-reassign
    return
  }

  if (msg) {
    response.status = msg.status || 500
    response.body = { error: { message: msg.message || msg } }
    state.err = err // eslint-disable-line no-param-reassign
    return
  }

  // eslint-disable-next-line array-callback-return
  options.some(option => {
    if (Array.isArray(option)) {
      const [issueFlag, status, { isError, ...issueOverride } = {}] = option
      if (err.flag === issueFlag) {
        const [[key, message]] = Object.keys(issueOverride).length
          ? Object.entries(issueOverride)
          : [[err.flag, err.message]]

        response.status = status
        response.body = { error: { message, [key]: true } }

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
