#!/usr/bin/env node

import * as program from 'commander';
import { scanXrayAndSaveFiles } from '../lib/xray-trace-fetcher';
import { logger, changeConsoleLevel } from '../lib/logger';
import {isEmpty} from 'lodash';
import { EXCESSIVE_PERMISSION_FILE, ScanXrayTracesConf } from '../index';

// tslint:disable-next-line:no-var-requires
const version = require('./../../package.json').version;

let parseError = false;

function error(msg: string, ...args: any[]) {
  console.error(`\nError: ${msg}`, args);
}

/**
 * Print help and exit
 */
function helpError() {
  program.help();
  process.exit(1);
}

/**
 * Will parse an int but if fails will print an error and set parseError to true.
 */
function parseIntWithError(s: string, def: string) {
  const i = parseInt(s, 10);
  if(isNaN(i)) {
    parseError = true;
    error("Failed parsing integer value: [%s]", s);
  }
  return i;
}

// tslint:disable:max-line-length
program.version(version)  
  .option('-s, --start-time <timestamp>', 'Start time as Unix timestamp (seconds since 1970-01-01 00:00:00 UTC). Optional: if left out will use: (current time - time range).', parseIntWithError)
  .option('-r, --time-range <minutes>', 'Time range in minutes to scan from start time.', parseIntWithError, 60)
  .option('-c, --compare', 'Compare current role and generated roles. Output a json report.')
  .option('-v, --verbose', 'Output verbose logs to the console (info and above).')
  .option('-f, --filter <expression>', 'Filter expression to use when scanning xray. See AWS docs for synatx.')
  .parse(process.argv);
// tslint:enable:max-line-length

if(parseError) {
  helpError();
}

//sanity check on start time
const now = Date.now();
const startTime = program.startTime ? program.startTime * 1000 : undefined;
if(startTime && (startTime < (now - 30*24*60*60*1000) || startTime > (now + 60*1000))) {
  error("Invalid start time [%s]. Start time can't be older than 30 days or in the future.", program.startTime);
  helpError();
}

const conf: ScanXrayTracesConf = {
  startTime: startTime ? new Date(startTime) : undefined,
  timeRangeMinutes: program.timeRange,
  filterExpression: program.filter,
};

if(program.verbose) {
  changeConsoleLevel('info');
  logger.info("Console logging set to verbose level: [info]");
}

if(program.compare) {
  logger.info("Enabling role comparison.");
  conf.compareExistingRole = true;
}

scanXrayAndSaveFiles(conf)
.then((res) => {  
  console.log('Completed running xray scan.');  
  if(!isEmpty(res.GeneratedPolicies)) {
    console.log("Generated IAM policies based upon xray scan:");
    for (const p of res.GeneratedPolicies) {
      console.log(`${p.Arn} - ${p.FileName}`);
    }    
  }
  else {
    console.log("No IAM policies generated");
  }
  if(!isEmpty(res.ExcessPermissions)) {
    console.log("Found excessive permissions. Result written out to: ", EXCESSIVE_PERMISSION_FILE);
  }
  else if(program.compare){
    console.log("No excessive permisssions found.");
  }
})
.catch((err) => {
  console.error('Unexpected Error: Failed running scan: ', err);
});
