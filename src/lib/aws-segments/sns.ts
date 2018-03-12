import {SegmentParseFunc} from './index';
import { ResourceActionMap } from '../xray-trace-fetcher';
import {isEmpty} from 'lodash';
import {logger} from '../logger';
import { extractRegion } from './utils';

/**
 * Map which is used to replace functions which are named differently to the IAM naming
 * See also: https://docs.aws.amazon.com/IAM/latest/UserGuide/list_sns.html
 */
const OPS_REPLACERS: {[i: string]: string} = {  
};

/**
 * Global actions that work on root star
 */
const GLOBAL_ACTIONS = /^(ListTopics|ListPlatformApplications|ListSubscriptions|CreateTopic|CreatePlatformApplication)$/;

// tslint:disable:jsdoc-format
/**
 * Parse a SNS segement. SNS segment will look like this:
 * 
{
    "id": "4b1fd180bd9678f2",
    "name": "SNS",
    "start_time": 1520849681.61,
    "end_time": 1520849681.714,
    "http": {
        "response": {
            "status": 200
        }
    },
    "aws": {
        "operation": "ListSubscriptionsByTopic",
        "region": "us-east-1",
        "request_id": "0b537b2c-4c01-5f50-b619-280c195091e7",
        "retries": 0,
        "topic_arn": "arn:aws:sns:us-east-1:123456789012:test-topic"
    },
    "namespace": "aws"
}
 * 
 * @param segmentDoc 
 * @param actionsMap 
 */
const parseSegment: SegmentParseFunc = function(segmentDoc: any, actionsMap: ResourceActionMap, functionArn: string) {
  const aws: any = segmentDoc.aws;
  let arn;
  if(isEmpty(aws)) {
    logger.warn("Couldn't extract SNS info for segment document: ", segmentDoc);
    return;
  }
  const region = aws.region || extractRegion(functionArn);	
  const op = OPS_REPLACERS[aws.operation] || aws.operation;
  if(GLOBAL_ACTIONS.test(op)) {
    arn = `arn:aws:sns:${region}:*:*`;
  }
  else {
    if(!aws.topic_arn) {
      logger.warn("Empty topic_arn for SNS op: [%s] on segment (skipping): ", op, segmentDoc);
      return;
    }
    //construct the arn		
    arn = `arn:aws:sns:${region}:*:${aws.topic_arn}`;
  }  
  actionsMap.addActionToResource(op, arn);
};
// tslint:enable:jsdoc-format

export default parseSegment;
