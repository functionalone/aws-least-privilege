import * as winston from 'winston';

const transports: winston.TransportInstance[] = [];
const consoleTransport = new (winston.transports.Console)({
  name: 'console-log',
  level: 'error',
  timestamp: true,
  colorize: true,
  prettyPrint: true,
});
transports.push(consoleTransport);

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  transports.push(
    new winston.transports.File({
      name: 'file-log',
      filename: 'xray-scan.log',
      level: 'debug',
      timestamp: true,
      json: false,
      prettyPrint: true,
      maxsize: 1024 * 1024 * 100,
      maxFiles: 10,
      tailable: true,
    }));
}

winston.configure({
  level: 'error',
  transports,
});

export const logger = winston;

export function changeConsoleLevel(level: string) {
  consoleTransport.level = level;
}
