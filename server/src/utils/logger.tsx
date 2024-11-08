// utils/logger.ts
import DailyRotateFile from 'winston-daily-rotate-file';
import winston from 'winston';
import path from 'path';

// Define custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  trace: 6,
  system: 7
};

// Define custom colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'grey',
  verbose: 'white',
  debug: 'cyan',
  trace: 'magenta',
  system: 'blue'
};


// Get values from environment variables
const logLevel = (process.env.LOG_LEVEL || 'system').toLowerCase();
const useJsonFormat = process.env.LOG_IS_FORMAT_JSON === 'true'; // Change this to `false` for pretty format
const useDetails = process.env.LOG_IS_FULL_DETAILS === 'true'; // Change this to `false` to hide file and line details and some more information in logs 
const enableFileLogging = process.env.LOG_ENABLED_FILE_LOGGING === 'true';
const logDirPath = process.env.LOG_DIR_PATH || './logs';
const enableExternalLogging = process.env.LOG_ENABLED_EXTERNAL_LOGGING === 'true';
const externalHttpHost = process.env.LOG_EXTERNAL_HTTP_HOST || '';
const externalHttpPort =  Number(process.env.LOG_EXTERNAL_HTTP_PORT) || 80;
const externalHttpPath =process.env.LOG_EXTERNAL_HTTP_PATH || '';
const externalHttpLevel = process.env.LOG_EXTERNAL_HTTP_LEVEL || 'info';
const externalHttpToken = process.env.LOG_EXTERNAL_HTTP_TOKEN || '';

const stack_number = useJsonFormat ? 11 : 12;


// Function to get file and line for each log 
const getCallerInfo = () => {
  const error = new Error();
  const stack = error?.stack?.split('\n');
  if (!stack) {return 'Unknown';}
  const callerLine = stack[stack_number]; // Index 3 is typically the caller in this setup
  
  const match = callerLine.match(/\/src\/(.+):(\d+)/);
  if (match) {
    const [, filePath, line] = match;
    return `${filePath}:${line}`;
  }
  return 'Unknown';
};

// Define custom formats
const jsonSimpleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format((info) => {
    const { timestamp, level, message, ...meta } = info;

    info['meta'] = JSON.stringify({ ...meta});
    info['timestamp'] = timestamp;
    return info;
  })(),
  winston.format.json()
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format((info) => {
    const { timestamp, level, message, ...meta } = info;
    const file = getCallerInfo();
    info['meta'] = JSON.stringify({ ...meta});
    info['timestamp'] = timestamp;
    info['pid'] = process.pid;
    info['file'] = file;

    return info;
  })(),
  winston.format.json()
);




const prettyFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.printf(({ timestamp, level, message, metadata, stack, ...rest }) => {
    // Pad the level to a minimum of 10 characters
    const paddedLevel = level.toUpperCase().padEnd(7);
    const file= getCallerInfo();
    let logMessage = `${timestamp} [${paddedLevel}]`;
    
    if (metadata.label) {
      logMessage += ` [${metadata.label}]`;
    }
    
    logMessage += ` [PID:${process.pid}]`;
    
    if (metadata.filename && metadata.line) {
      logMessage += ` [${metadata.filename}:${metadata.line}]`;
    }
    
    logMessage += ` (${file}) :`;

     // Stringify objects and arrays
    if (typeof message === 'object' && message !== null) {
      logMessage += ` ${JSON.stringify(message, null, 2)}`;
    } else {
      logMessage += ` ${message}`;
    }
    
    if (Object.keys(metadata).length > 0) {
      logMessage += ` ${JSON.stringify(metadata)}`;
    }
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    return logMessage;
  })
);

const prettySimpleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const paddedLevel = level.toUpperCase().padEnd(7);
    let finalMessage = message;
    if (typeof message === 'object' && message !== null) {
      finalMessage = ` ${JSON.stringify(message, null, 2)}`;
    } 
    return `${timestamp} [${paddedLevel}]: ${finalMessage} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ''
    }`;
  })
);

// Create a function to get the format based on a condition
const getFormat = () => (useJsonFormat  ? useDetails ? jsonFormat : jsonSimpleFormat : useDetails ? prettyFormat : prettySimpleFormat );



const configureTransports = () => {
  const transports : winston.transport[] =  [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true })
      )
    }),
  ]


  if (enableExternalLogging){
    transports.push(
      new winston.transports.Http({
        host: externalHttpHost,
        path: externalHttpPath,
        port: externalHttpPort,
        level: externalHttpLevel,
        headers: {
          'Authorization': `Bearer ${externalHttpToken}`,
          'Content-Type': 'application/json'
        }
      })
    )
  }


  if (enableFileLogging) { 
    transports.push(
      new DailyRotateFile({
        filename: `${logDirPath}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '20d',
        level: 'error',
      })
    );

    transports.push(
      new DailyRotateFile({
        filename: `${logDirPath}/combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '20d',
      })
    );
  }


  return transports;
}

const logger = winston.createLogger({
  levels,
  level: logLevel,
  format: getFormat(),
  transports: configureTransports(), 
});

// Add colors to winston
winston.addColors(colors);

// Define custom logger interface
interface CustomLogger extends winston.Logger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trace(message: string, meta?: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  system(message: string, meta?: any): void;
}

// Export the logger
export default logger as CustomLogger;



