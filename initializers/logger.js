'use strict'

const bunyan = require('bunyan')
const path = require('path')

module.exports = (name, logPath) => {
  const params = { name, serializers: bunyan.stdSerializers }

  if (logPath) {
    params.streams = [
      {
        type: 'rotating-file',
        path: path.join(
          logPath === true ? `/var/log/effects-loop/${name}` : logPath,
          `${name}.log`,
        ),
        period: '1d',
        count: 3,
      },
    ]
  }

  return bunyan.createLogger(params)
}
