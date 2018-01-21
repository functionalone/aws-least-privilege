import {SegmentParseFunc} from './index';
import { ResourceActionMap } from '../xray-trace-fetcher';
import {isEmpty} from 'lodash';
import {logger} from '../logger';
import { extractRegion } from './utils';

/**
 * Map which is used to replace functions which are named differently to the IAM naming
 * See also: https://docs.aws.amazon.com/lambda/latest/dg/lambda-api-permissions-ref.html
 */
const OPS_REPLACERS: {[i: string]: string} = {
  Invoke: "InvokeFunction",
};

// tslint:disable:jsdoc-format
/**
 * Parse a lambda segement.Lambda segment will look like this:
 * 
 * {
			"id": "9eec41fb9395e0f6",
			"name": "Lambda",
			"start_time": 1516546090.963,
			"end_time": 1516546092.522,
			"http": {
				"response": {
					"status": 200
				}
			},
			"aws": {
				"operation": "Invoke",
				"region": "us-east-1",
				"request_id": "1a046fdb-feba-11e7-ad53-71dbd83b223a",
				"retries": 0,
				"function_name": "java-test-dev-hello",
				"status_code": 200,
				"resource_names": [
					"java-test-dev-hello"
				]
			},
			"namespace": "aws"
		}
 * @param segmentDoc 
 * @param actionsMap 
 */
const parseSegment: SegmentParseFunc = function(segmentDoc: any, actionsMap: ResourceActionMap, functionArn: string) {
  const aws: any = segmentDoc.aws;
  if(isEmpty(aws) || !aws.function_name) {
    logger.warn("Couldn't extract Lambda info for segment document: ", segmentDoc);
    return;
  }  
  const op = OPS_REPLACERS[aws.operation] || aws.operation;
  const region = aws.region || extractRegion(functionArn);	
  //construct the arn		
  const arn = `arn:aws:lambda:${region}:*:function:${aws.function_name}`;
  let actions = actionsMap.get(arn);
  if(!actions) {
    actions = new Set();
    actionsMap.set(arn, actions);
  }
  actions.add(op);
};
// tslint:enable:jsdoc-format

export default parseSegment;
