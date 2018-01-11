import { SegmentParseFunc } from './index';
import { ResourceActionMap } from '../xray-trace-fetcher';
import { isEmpty } from 'lodash';
import { logger } from '../logger';

/**
 * Map which is used to replace functions which are named differently to the IAM naming
 * See also: https://docs.aws.amazon.com/AmazonS3/latest/dev/using-with-s3-actions.html 
 */
const OPS_REPLACERS: {[i: string]: string} = {
  SetObjectTagging: "PutObjectTagging", //java uses SetObjectTagging
  ListObjectsV2: "ListObjects",
  CreateMultipartUpload: "PutObject",
  InitiateMultipartUpload: "PutObject",
};

// tslint:disable:jsdoc-format
/**
 * Parse a segment doc of the form:
 *        {
						"id": "a9569a00818d9c39",
						"name": "S3",
						"start_time": 1515258502.13,
						"end_time": 1515258502.551,
						"http": {
							"response": {
								"status": 200
							}
						},
						"aws": {
							"operation": "PutObjectTagging",
							"region": "us-east-1",
							"request_id": "8FD6355098FDA7FF",
							"retries": 0,
							"id_2": "ojziCQI49ORfKE0mdJGT8xe/vImyUo267pdywhumx1zcUNcXz/+zhVPzN7+r6wG5YWerWnn/K9Y=",
							"bucket": "fone-demo-test-bucket",
							"key": "nodejs-test-object",
							"bucket_name": "fone-demo-test-bucket"
						},
						"namespace": "aws"
					}
 * @param segmentDoc 
 * @param actionsMap 
 */
const parseSegment: SegmentParseFunc = function (segmentDoc: any, actionsMap: ResourceActionMap, functionArn: string) {
  const aws: any = segmentDoc.aws;
  if (isEmpty(aws) || !aws.bucket_name) {
    logger.warn("Couldn't extract S3 bucket info for segment document: ", segmentDoc);
    return;
  }
  const arn = `arn:aws:s3:::${aws.bucket_name}/*`;
  let actions = actionsMap.get(arn);
  if (!actions) {
    actions = new Set();
    actionsMap.set(arn, actions);
  }
  const op = OPS_REPLACERS[aws.operation] || aws.operation;
  actions.add(op);
};

export default parseSegment;
