'use strict'

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

const truncate = (obj, truncateLen = 500) => {
  if (truncateLen === 0) return ''
  const str = JSON.stringify(obj, null, '  ') // add spaces to mimic normal printing
  return str.length > truncateLen
    ? `${str.substring(0, truncateLen)}... (truncated ${str.length - truncateLen} chars)`
    : obj
}

const logInfo = log => async (ctx, next) => {
  const {
    request: {
      method,
      url,
      body: { password, token: reqToken, ...cleanRequestBody },
      ip,
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

  if (method === 'OPTIONS' && response.status === 204) return

  const FILTERED = '*******'

  let body = cleanRequestBody
  if (password) body.password = FILTERED
  if (reqToken) body.token = FILTERED
  body = truncate(body, state.requestBodyMaxLoggingLen)

  let { body: cleanResponseBody } = response
  if (cleanResponseBody) {
    const { token: resToken, secret, ...clnRes } = cleanResponseBody
    cleanResponseBody = clnRes
    if (resToken) cleanResponseBody.token = FILTERED
    if (secret) cleanResponseBody.secret = FILTERED
    cleanResponseBody = truncate(cleanResponseBody, state.responseBodyMaxLoggingLen)
  }

  const params = {
    responseStatus: response.status,
    method,
    url,
    body,
    ip,
    responseTime: Date.now() - start,
    responseBody: cleanResponseBody,
    id,
  }

  if (state.err) log.error({ ...params, err: state.err })
  else if (state.warning) log.warn({ ...params, warning: state.warning })
  else log.info(params)
}

const setMaxRequestLoggingLen = requestBodyMaxLoggingLen => (ctx, next) => {
  ctx.state.requestBodyMaxLoggingLen = requestBodyMaxLoggingLen
  return next()
}

const setMaxResponseLoggingLen = responseBodyMaxLoggingLen => (ctx, next) => {
  ctx.state.responseBodyMaxLoggingLen = responseBodyMaxLoggingLen
  return next()
}

const handle404 = (ctx, next) => {
  const {
    response,
    request: { method, url },
    state,
  } = ctx

  if (response.status === 404 && !response.body) {
    const warning = `Unknown endpoint requested: ${method} ${url}`
    response.body = { error: { message: warning } }
    state.warning = warning
    response.status = 404 // Gets set to 200 if we don't specify it
  }
  return next()
}

module.exports = {
  errorFallback,
  addTracking,
  logInfo,
  setMaxRequestLoggingLen,
  setMaxResponseLoggingLen,
  handle404,
}
