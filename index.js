'use strict'

const Koa = require('koa')
const bodyParser = require('koa-bodyparser')

const buildLogger = require('./initializers/logger')
const { addTracking, logInfo, errorFallback } = require('./lib/middleware')
const handleError = require('./lib/handleError')

const buildServer = ({ name, routes, noLogging = false }) => {
  const log = buildLogger(name)
  const app = new Koa()

  app.use(bodyParser())
  app.use(addTracking)
  if (!noLogging) app.use(logInfo(log))
  app.use(errorFallback)

  if (routes) {
    routes.forEach(route => {
      app.use(route.routes())
    })
  }

  return { app, log }
}

module.exports = {
  buildServer,
  handleError,
}
