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
  ListObjectsV2: "ListBucket",
  ListObjects: "ListBucket",
  CreateMultipartUpload: "PutObject",
  InitiateMultipartUpload: "PutObject",
  ListBuckets: "ListAllMyBuckets", 
};

/**
 * Regex to check for Bucket level operations. Applied after the OPS_REPLACERS
 * See: https://docs.aws.amazon.com/AmazonS3/latest/dev/using-with-s3-actions.html#using-with-s3-actions-related-to-buckets
 */
// tslint:disable-next-line:max-line-length
const BUCKET_ACTIONS = /^(ListBucketVersions|ListBucketMultipartUploads|ListBucket|GetBucket.+|PutBucket.+|DeleteBucket.+|.+EncryptionConfiguration|.+InventoryConfiguration|.+LifecycleConfiguration|.+MetricsConfiguration|.+ReplicationConfiguration|.+AnalyticsConfiguration|.+AccelerateConfiguration)$/;

/**
 * Global actions that work on root star
 */
const GLOBAL_ACTIONS = /^(ListAllMyBuckets|CreateBucket|DeleteBucket)$/;
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
const parseSegment: SegmentParseFunc = function(segmentDoc: any, actionsMap: ResourceActionMap, functionArn: string) {
  const aws: any = segmentDoc.aws;
  if (isEmpty(aws)) {
    logger.warn("Empty aws section (skipping) for segment: ", segmentDoc);
    return;
  }
  
  const op = OPS_REPLACERS[aws.operation] || aws.operation;
  let arn;
  if(GLOBAL_ACTIONS.test(op)) {
    arn = 'arn:aws:s3:::*';
  }
  else { 
    if(!aws.bucket_name) {
      logger.warn("Empty bucket_name for bucket op: [%s] on segment (skipping): ", op, segmentDoc);
      return;
    }
    if(BUCKET_ACTIONS.test(op)) {
      arn = `arn:aws:s3:::${aws.bucket_name}`;
    }
    else {
      arn = `arn:aws:s3:::${aws.bucket_name}/*`;
    }
  }
  let actions = actionsMap.get(arn);
  if (!actions) {
    actions = new Set();
    actionsMap.set(arn, actions);
  }
  actions.add(op);
};

export default parseSegment;
