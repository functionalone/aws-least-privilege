import {logger} from '../logger';

export function extractRegion(functionArn: string) {
  const prefix = "arn:aws:lambda:";
  if(functionArn.startsWith(prefix)) {
    return functionArn.slice(prefix.length, functionArn.indexOf(':', prefix.length));
  }
  else {
    logger.warn("Arn: [%s] doesn't start with prefix: %s. Can't extract region will use env.AWS_REGION.", functionArn, prefix);
    return process.env.AWS_REGION;
  }  
}
