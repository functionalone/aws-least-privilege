import {SegmentParseFunc} from './index';
import { ResourceActionMap } from '../xray-trace-fetcher';
import {isEmpty} from 'lodash';
import {logger} from '../logger';
import { extractRegion } from './utils';

// tslint:disable:jsdoc-format
/**
 * Parse a dynamodb segement. DynamoDB segment will look like this:
 * 
 * {						
						"id": "491547679650c254",
						"name": "DynamoDB",
						"start_time": 1515258497.911,
						"end_time": 1515258501.692,
						"http": {
							"response": {
								"status": 200
							}
						},
						"aws": {
							"operation": "PutItem",
							"region": "us-east-1",
							"request_id": "E6QO2IJHL85I63K7N7KIQPP1UFVV4KQNSO5AEMVJF66Q9ASUAAJG",
							"retries": 0,
							"table_name": "gen-docs",
							"consumed_capacity": {
								"TableName": "gen-docs",
								"CapacityUnits": 1
							},
							"resource_names": [
								"gen-docs"
							]
						},
						"namespace": "aws"
          }          
 * @param segmentDoc 
 * @param actionsMap 
 */
const parseSegment: SegmentParseFunc = function(segmentDoc: any, actionsMap: ResourceActionMap, functionArn: string) {
  const aws: any = segmentDoc.aws;
  if(isEmpty(aws) || !aws.table_name) {
    logger.warn("Couldn't extract DynamoDB info for segment document: ", segmentDoc);
    return;
  }  
  const region = aws.region || extractRegion(functionArn);	
  //construct the arn		
  const arn = `arn:aws:dynamodb:${region}:*:table/${aws.table_name}`;
  actionsMap.addActionToResource(aws.operation, arn);  
};
// tslint:enable:jsdoc-format

export default parseSegment;
