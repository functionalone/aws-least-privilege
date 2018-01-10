import { logger } from './logger';
import * as AWS from 'aws-sdk';
import { isEmpty, get } from 'lodash';
import { SUPPORTED_SERVICES, AWSSegmentParsers } from './aws-segments/index';
import * as BBPromise from 'bluebird';
import { IamPolicyDocument, IamStatement } from './aws-segments/iam-policy';
import * as crypto from 'crypto';
import * as fs from 'fs';
import {Trace} from 'aws-sdk/clients/xray';

const DEF_TIME_RANGE = 60;

export interface GetXrayTracesConf {
  /**
   * start time to search for. If not specified will do a "last x min search"
   */
  startTime?: Date;
  /**
   * Time in minutes range to search. If startTime is not specified this will be used as a last X min search. 
   * Defaults to: 60
   */
  timeRangeMinutes?: number;
}

/**
 * Fetch xray traces. Combines the two functions of getTraceSummaries and batchGetTraces including support for pagination.
 */
export async function getXrayTraces(conf?: GetXrayTracesConf) {
  try {
    logger.info('getXrayTraces: params: ', conf);
    const xray = new AWS.XRay();
    const timeRangeMS = ((conf && conf.timeRangeMinutes) || DEF_TIME_RANGE) * 60 * 1000;
    const StartTime = (conf && conf.startTime) || new Date(Date.now() - timeRangeMS);
    const EndTime = new Date(StartTime.getTime() + timeRangeMS);
    logger.info("GetTraceSummariesRequest: StarTime: %s, EndTime: %s", StartTime, EndTime);
    const summariesParams: AWS.XRay.Types.GetTraceSummariesRequest = {
      StartTime,
      EndTime,
    };
    let paginationNum = 0;
    let nextToken: string | undefined;
    let summaries: AWS.XRay.TraceSummary[] = [];
    do {
      summariesParams.NextToken = nextToken;
      const traceSummariesResp = await xray.getTraceSummaries(summariesParams).promise();
      logger.debug('getTraceSummaries [token: %s] result: ', nextToken, traceSummariesResp);
      if(traceSummariesResp.TraceSummaries) {
        summaries = summaries.concat(traceSummariesResp.TraceSummaries);
      }
      nextToken = traceSummariesResp.NextToken;
      paginationNum++;
    } while (nextToken);    
    logger.info('getTraceSummaries total summaries after [%s] pagination: ', paginationNum, summaries.length);
    let batchNum = 0;
    let ids: string[] = [];
    // tslint:disable-next-line:max-line-length
    const batchResults = await BBPromise.map<AWS.XRay.TraceSummary, AWS.XRay.BatchGetTracesResult | null>(summaries, (trace, index, arrayLength) => {
      if (trace.Id) {
        ids.push(trace.Id);
      }
      //aws enforces max 5 ids in a batch. We do the request when we reach 5 or on the last index
      if (ids.length === 5 || index === (arrayLength - 1)) {
        logger.debug('Performing batchGetTraces with ids: ', ids);
        const res = xray.batchGetTraces({ TraceIds: ids }).promise();
        ids = [];
        batchNum++;
        return res;
      }
      return null;
    }, { concurrency: 10 });
    let traces: Trace[] = [];
    for (const res of batchResults) {
      if (res) {
        logger.debug("batchGetTraces result: ", res);
        if (!isEmpty(res.Traces)) {
          logger.debug('batchGetTraces count: ', res.Traces!.length);
          traces = traces.concat(res.Traces!);
        }
        else {
          logger.error('Got empty result from batchGetTraces for ids: ', ids);
        }
      }
    }
    logger.info('getXrayTraces total traces returned: %s, number of batches: %s', traces.length, batchNum);
    return traces;
  } catch (error) {
    logger.error("Failed fetching traces: ", error);
    throw error;
  }
}

/**
 * Maps that maps a resource to set of actions
 */
export type ResourceActionMap = Map<string, Set<string>>;

/**
 * Map which maps a function to the set of ResourceActionMap
 */
export type FunctionToActionsMap = Map<string, ResourceActionMap>;

function parseSegmentDoc(doc: any, functionMap: FunctionToActionsMap, parentActionsMap?: ResourceActionMap, functionArn?: string) {
  //if this is a subsegment we will want to add to the parentActionsMap if this relates to an aws service
  if (parentActionsMap && doc.namespace === 'aws' && SUPPORTED_SERVICES.indexOf(doc.name) >= 0) {
    AWSSegmentParsers[doc.name](doc, parentActionsMap, functionArn!);
  }
  //see if this is a Lambda function. If so it will have aws.function_arn
  const arn = get(doc, 'aws.function_arn');
  let actionsMap: ResourceActionMap | undefined;
  if (arn) {
    logger.debug('Found arn: %s for Segment: %s', arn, doc.id);
    actionsMap = functionMap.get(arn);
    if (!actionsMap) {
      actionsMap = new Map();
      functionMap.set(arn, actionsMap);
    }
  }
  if (!isEmpty(doc.subsegments)) {
    for (const subsegment of doc.subsegments) {
      parseSegmentDoc(subsegment, functionMap, actionsMap, arn);
    }
  }
}

/**
 * Parse an xray trace return the passed in functionMap
 * @param trace 
 * @param functionMap will populate with the found results
 */
export function parseXrayTrace(trace: AWS.XRay.Trace, functionMap: FunctionToActionsMap): FunctionToActionsMap {
  if (isEmpty(trace.Segments)) {
    logger.info('No segments found for TraceId: ', trace.Id);
    return functionMap;
  }
  //we search for lambda segments and then follow into sub segments
  for (const segment of trace.Segments!) {
    const docStr = segment.Document;
    if (isEmpty(docStr)) {
      logger.warn("Got segment [id: %s] with empty Document.", segment.Id);
    }
    else {
      parseSegmentDoc(JSON.parse(docStr!), functionMap);
    }
  }
  return functionMap;
}

export function parseXrayTraces(traces: AWS.XRay.Trace[], functionMap: FunctionToActionsMap): FunctionToActionsMap {
  if (isEmpty(traces)) {
    return functionMap;
  }
  for (const trace of traces) {
    parseXrayTrace(trace, functionMap);
  }
  return functionMap;
}

export async function getFunctionActionMapFromXray(conf?: GetXrayTracesConf) {
  const traces = await getXrayTraces(conf);
  const map: FunctionToActionsMap = new Map();
  return parseXrayTraces(traces, map);
}

export function createIAMPolicyDoc(map: ResourceActionMap, functionArn: string) {
  const doc: IamPolicyDocument = {
    Version: "2012-10-17",
    Description: "Generated policy from xray scan for: " + functionArn,
    Statement: [],
  };
  //consolidate resources with the same functions into one entry
  const actionMap = new Map<string, {resources: string[], actions: string[]}>();
  for (const entry of map.entries()) {
    const match = entry[0].match(/arn:aws:(.+?):/);
    let service = '';
    if(!match || match.length < 2) {
      logger.error("Couldn't extract service name from resource arn: ", entry[0]);
    }
    else {
      service = match[1];
    }
    const actions = Array.from(entry[1], (s) => `${service}:${s}`).sort();
    const actionsKey = actions.join();
    let actionMapEntry = actionMap.get(actionsKey);
    if(!actionMapEntry) {
      actionMapEntry = {
        resources: [],
        actions,
      };
      actionMap.set(actionsKey, actionMapEntry);
    }
    actionMapEntry.resources.push(entry[0]);
  }
  for (const val of actionMap.values()) {
    const stm: IamStatement = {
      Effect: "Allow",      
      Action: val.actions,
      Resource: val.resources,
    };
    doc.Statement!.push(stm);  
  }  
  return doc;
}

/**
 * 
 * @param conf 
 * @return object mapping function arn to file name
 */
export async function scanXrayAndSavePolicyDocs(conf?: GetXrayTracesConf) {
  const map: FunctionToActionsMap = await getFunctionActionMapFromXray(conf);  
  const res: {[i: string]: string} = {};
  for (const entry of map.entries()) {
    const policyDoc = createIAMPolicyDoc(entry[1], entry[0]);
    const hash = crypto.createHash('md5');
    hash.update(entry[0]);
    const fileName = hash.digest('hex') + ".policy.json";
    res[entry[0]] = fileName;
    try {
      fs.writeFileSync(fileName, JSON.stringify(policyDoc, undefined, 2));
    } catch (error) {
      logger.error("Failed writing to file: [%s] ",fileName, error);
    }
  }
  return res;
}

// export XRay.Trace;
