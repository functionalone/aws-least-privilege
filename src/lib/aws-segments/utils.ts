import {logger} from '../logger';
import * as URL from 'url';

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

/**
 * Extract region info assuming it appears in the host part after the amazonaws.com part. 
 * For example: https://sqs.us-east-1.amazonaws.com/1111111111/test-msg-queue
 * @param urlSrt 
 */
export function extractRegionFromUrl(urlSrt: string) {
  const urlObj = URL.parse(urlSrt);
  const host = urlObj.hostname;
  if(!host) {
    return undefined;
  }
  const regexMatch = host.match(/.*\.(.+)\.amazonaws.com$/);
  if(!regexMatch || regexMatch.length < 2) {
    return undefined;
  }
  return regexMatch[1];
}
