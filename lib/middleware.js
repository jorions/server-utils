'use strict'

/* eslint-disable */
// Taken from https://gist.github.com/jed/982883
const uuid = a =>
  a
    ? (a ^ ((Math.random() * 16) >> (a / 4))).toString(16)
    : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, uuid)
/* eslint-enable */

const addTracking = (ctx, next) => {
  ctx.state.start = Date.now()
  ctx.state.id = uuid()
  return next()
}

const logInfo = log => async (ctx, next) => {
  const {
    request: {
      method,
      url,
      body: { password, ...cleanBody },
    },
    response,
    state: { id, start },
    state,
  } = ctx

  ctx.state.log = {
    info: (...args) => {
      if (args.length === 2) log.info({ ...args[0], id }, args[1])
      else log.info({ id }, args[0])
    },
    warn: (...args) => {
      if (args.length === 2) log.warn({ ...args[0], id }, args[1])
      else log.warn({ id }, args[0])
    },
    error: (...args) => {
      if (args.length === 2) log.error({ ...args[0], id }, args[1])
      else log.error({ id }, args[0])
    },
  }

  await next()

  // Handle requests to unknown endpoints
  if (response.status === 404 && !response.body) {
    const warning = `Unknown endpoint requested: ${method} ${url}`
    response.body = { error: { message: warning } }
    response.status = 404
    state.warning = warning
  }

  const body = cleanBody
  if (password) body.password = '*******'

  let { body: cleanResponseBody } = response
  if (cleanResponseBody) {
    const {
      body: { token, ...clnRes },
    } = cleanResponseBody
    cleanResponseBody = clnRes
    if (token) cleanResponseBody.token = '*******'
  }

  const params = {
    responseStatus: response.status,
    method,
    url,
    body,
    responseTime: Date.now() - start,
    responseBody: cleanResponseBody,
    id,
  }

  if (state.err) log.error({ ...params, err: state.err })
  else if (state.warning) log.warn({ ...params, warning: state.warning })
  else log.info(params)
}

const errorFallback = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.response.body = {
      error: {
        message: 'We encountered a problem',
      },
    }
    ctx.response.status = 500
    ctx.state.log.error({ err }, "Something broke that wasn't handled anywhere else")
  }
}

module.exports = {
  addTracking,
  logInfo,
  errorFallback,
}
