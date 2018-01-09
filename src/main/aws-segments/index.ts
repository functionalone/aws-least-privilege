import { ResourceActionMap } from "../xray-trace-fetcher";
import dynamoParser from './dynamo';
import s3Parser from './s3';

export type SegmentParseFunc = (segmentDoc: any, actionsMap: ResourceActionMap, functionArn: string) => void;

export const AWSSegmentParsers: {[i: string]: SegmentParseFunc} = {
  DynamoDB: dynamoParser,
  S3: s3Parser,
};

export const SUPPORTED_SERVICES = Object.getOwnPropertyNames(AWSSegmentParsers);
