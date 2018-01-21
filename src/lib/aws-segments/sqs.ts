import {SegmentParseFunc} from './index';
import { ResourceActionMap } from '../xray-trace-fetcher';
import {isEmpty} from 'lodash';
import {logger} from '../logger';
import { extractRegion, extractRegionFromUrl } from './utils';

/**
 * Map which is used to replace functions which are named differently to the IAM naming
 * See also: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-api-permissions-reference.html
 */
const OPS_REPLACERS: {[i: string]: string} = {  
};

// tslint:disable:jsdoc-format
/**
 * Parse a lambda segement.Lambda segment will look like this:
 * 
 * {
			"id": "ea2c2b1898983569",
			"name": "SQS",
			"start_time": 1516557606.766,
			"end_time": 1516557607.125,
			"http": {
					"response": {
							"status": 200
					}
			},
			"aws": {
					"operation": "SendMessage",
					"region": "us-east-1",
					"request_id": "244505fc-9f04-5941-b0aa-572248636472",
					"retries": 0,
					"queue_url": "https://sqs.us-east-1.amazonaws.com/1111111111/test-msg-queue",
					"message_id": "f28fc0d3-6e29-4ffc-b044-8e72b76bacb7",
					"resource_names": [
							"https://sqs.us-east-1.amazonaws.com/1111111111111/test-msg-queue"
					]
			},
			"namespace": "aws"
	}

	Another example:

	{
			"id": "83369696b54caa33",
			"name": "SQS",
			"start_time": 1516557606.423,
			"end_time": 1516557606.765,
			"http": {
					"response": {
							"status": 200
					}
			},
			"aws": {
					"operation": "GetQueueUrl",
					"region": "us-east-1",
					"request_id": "e959a673-10ee-5ad8-8836-f4adc788223e",
					"retries": 0,
					"queue_name": "test-msg-queue",
					"queue_url": "https://sqs.us-east-1.amazonaws.com/11111111111/test-msg-queue"
			},
			"namespace": "aws"
	}

 * @param segmentDoc 
 * @param actionsMap 
 */
const parseSegment: SegmentParseFunc = function(segmentDoc: any, actionsMap: ResourceActionMap, functionArn: string) {
  const aws: any = segmentDoc.aws;
  if(isEmpty(aws) || !aws.queue_url) {
    logger.warn("Couldn't extract SQS info for segment document: ", segmentDoc);
    return;
  }  
  const op = OPS_REPLACERS[aws.operation] || aws.operation;
  const region = aws.region || extractRegionFromUrl(aws.queue_url) || extractRegion(functionArn);	
  const regexMatch = (aws.queue_url as string).match(/.*\/(.+)$/);
  if(!regexMatch || regexMatch.length < 2) {
    logger.warn("Couldn't extract SQS queue name for segment document: ", segmentDoc);
    return;
  }
  const queueName = regexMatch[1];
  //construct the arn		
  const arn = `arn:aws:sqs:${region}:*:${queueName}`;
  let actions = actionsMap.get(arn);
  if(!actions) {
    actions = new Set();
    actionsMap.set(arn, actions);
  }
  actions.add(op);
};
// tslint:enable:jsdoc-format

export default parseSegment;
