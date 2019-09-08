'use strict'

const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const cors = require('@koa/cors')

const buildLogger = require('./initializers/logger')
const { addTracking, logInfo, errorFallback } = require('./lib/middleware')
const handleError = require('./lib/handleError')

const buildServer = ({ name, routes, noLogging = false, allowCors = false, middleware = [] }) => {
  const log = buildLogger(name)
  const app = new Koa()

  app.use(bodyParser())
  app.use(addTracking)
  if (!noLogging) app.use(logInfo(log))
  if (allowCors) app.use(cors())
  app.use(errorFallback)

  middleware.forEach(mid => {
    app.use(mid)
  })

  if (routes) {
    routes.forEach(route => {
      app.use(route.routes())
    })
  }

  return { app, log }
}

module.exports = {
  buildServer,
  buildRouter: options => new Router(typeof options === 'string' ? { prefix: options } : options),
  handleError,
}
