const { inspect } = require('util');

const clc = require('./colors');

const logLevel = process.env.LOG_LEVEL || 'trace';

const LOG_LEVEL_ENUM = {
  trace: 5,
  log: 4,
  info: 3,
  warn: 2,
  error: 1,
};

const PACK_ENUM = {
  regular: {
    error: 'red.bold',
    warn: 'blue.bold',
    info: 'green.bold',
    log: 'black',
    trace: 'blueBright',
  },
};

const logTimeElapsed = ({ label, started, end } = {}) => {
  if (!label) {
    return '';
  }
  const response = [
    'LABEL:',
    label,
  ];
  if (started) {
    let millis = Date.now() - started;
    const milliseconds = millis % 1000;
    millis = Math.floor(millis / 1000);
    const seconds = millis % 60;
    millis = Math.floor(millis / 60);
    const minutes = millis % 60;

    const text = `${`0${minutes}`.slice(-2)}:${`0${seconds}`.slice(-2)}.${milliseconds}`;
    if (end) {
      response.push('ENDED AFTER', text);
    } else {
      response.push('TIME FROM START:', text);
    }
  } else {
    response.push('STARTED TRACKING');
  }
  response.unshift('[');
  response.push(']');
  return response.join(' ');
};

const createOutputLog = (context, message) => [
  `[TIMESTAMP: ${new Date().toISOString()}]`,
  `[${context.value.toUpperCase()}]`,
  logTimeElapsed(context.currentLabel),
  ...message
    .map((part) => {
      if (['object'].includes(typeof part)) {
        return `\n${inspect(part, { showHidden: false, depth: null, colors: true })}`;
      }
      return part;
    }),
]
  .filter(Boolean)
  .join(' ')
  .concat('\n');

class LoggerClass {
  constructor(value, selectedPack) {
    this.value = value;
    this.packUsed = PACK_ENUM[selectedPack] || PACK_ENUM.regular;
    this.logLevel = LOG_LEVEL_ENUM[logLevel] || LOG_LEVEL_ENUM.log;
    this.timeLabels = {};
  }

  error(...message) {
    if (this.logLevel >= LOG_LEVEL_ENUM.error) {
      this.createFun(this.packUsed.error, message);
    }
  }

  warn(...message) {
    if (this.logLevel >= LOG_LEVEL_ENUM.warn) {
      this.createFun(this.packUsed.warn, message);
    }
  }

  info(...message) {
    if (this.logLevel >= LOG_LEVEL_ENUM.info) {
      this.createFun(this.packUsed.info, message);
    }
  }

  log(...message) {
    if (this.logLevel >= LOG_LEVEL_ENUM.log) {
      this.createFun(this.packUsed.log, message);
    }
  }

  trace(...message) {
    if (this.logLevel >= LOG_LEVEL_ENUM.trace) {
      this.createFun(this.packUsed.trace, message);
    }
  }

  time(label, providedLogLevel, ...message) {
    const logLevelUsed = this[providedLogLevel] ? providedLogLevel : 'info';
    const labelData = {
      logLevel: logLevelUsed,
      started: Date.now(),
    };
    if (!this[providedLogLevel]) {
      message.unshift(providedLogLevel);
    }
    this.timeLabels[label] = labelData;
    this.currentLabel = {
      label,
    };

    const response = this[logLevelUsed](...message);
    delete this.currentLabel;
    return response;
  }

  timeLog(label, ...message) {
    if (!this.timeLabels[label]) {
      return;
    }
    const data = this.timeLabels[label];
    this.currentLabel = {
      label,
      started: data.started,
    };
    this[data.logLevel](...message);
    delete this.currentLabel;
  }

  timeEnd(label, ...message) {
    if (!this.timeLabels[label]) {
      return;
    }
    const data = this.timeLabels[label];
    this.currentLabel = {
      label,
      started: data.started,
      end: true,
    };
    delete this.timeLabels[label];
    this[data.logLevel](...message);
    delete this.currentLabel;
  }

  trackRequest(router, headersTracked, providedLogLevel) {
    const logLevelProvided = (typeof headersTracked === 'string' ? headersTracked : providedLogLevel);
    const { randomHash } = { randomHash: () => 1 }; // require('./helper.function.service');
    return (req, res, next) => {
      const identifier = randomHash();
      const data = {
        router,
        url: req.path,
        method: req.method,
      };
      if (headersTracked && headersTracked.length > 0 && headersTracked instanceof Array) {
        data.headers = Object.assign({}, ...headersTracked
          .map((key) => ({ [key]: req.headers[key] })));
      }

      this.time(identifier, logLevelProvided, data);
      const intervalID = setInterval(() => this.timeLog(identifier, 'request is still processing'), 2000);
      res.on('finish', () => {
        clearInterval(intervalID);
        this.timeEnd(identifier, data);
      });
      return next();
    };
  }

  createFun(packString, message) {
    const funUsed = packString.split('.').reduce((prev, next) => prev[next], clc);
    const text = funUsed(createOutputLog(this, message));
    process.stdout.write(text);
    clc.reset();
  }
}

module.exports = (...args) => new LoggerClass(...args);
