import {assert} from 'chai';
import { getXrayTraces, parseXrayTrace, FunctionToActionsMap, getFunctionActionMapFromXray, 
    ResourceActionMap, createIAMPolicyDoc, ScanXrayTracesConf, scanXray } from '../lib/xray-trace-fetcher';
import * as nock from 'nock';
// import * as fs from 'fs';
import { isArray } from 'util';

// tslint:disable:max-line-length
// tslint:disable-next-line:no-var-requires
const TRACE1 = require('../../src/test/trace1.json');
// tslint:disable-next-line:no-var-requires
const TRACE2 = require('../../src/test/trace2.json');

describe('xray fetch tests', function() {

  this.timeout(60000);

  before(() => {
    // nock.recorder.rec({
    //   output_objects: true,
    // });
    // nock.load('nock1.rec.json');
    nock.load('src/test/xray-trace-fetcher.nock.json');    
  });

  // after(() => {
  //   const nockRec = nock.recorder.play();
  //   fs.writeFileSync('nock.rec.json', JSON.stringify(nockRec, undefined, 2));
  // });

  it('getXrayTraces should fetch 6 traces', async function() {
    const traces = await getXrayTraces({
      startTime: new Date(1515240998000),
      timeRangeMinutes: 300,
    });
    assert.isArray(traces);
    assert.equal(traces!.length, 6);
  });

  it('getXrayTraces large fetch test', async function() {
    const traces = await getXrayTraces({
      startTime: new Date(1515314999000),
      timeRangeMinutes: 300,
    });
    assert.isArray(traces);
    assert.isNotEmpty(traces);    
    console.log('getXrayTraces returned [%s] traces', traces!.length);
    assert.isAtLeast(traces!.length, 35);
  });

  it('getFunctionActionMapFromXray returns functions', async function() {
    const map = await getFunctionActionMapFromXray({
      startTime: new Date(1515314999000),
      timeRangeMinutes: 300,
    });
    assert.equal(map.size, 2);    
    for (const actionMap of map.values()) {
      for (const key of actionMap.keys()) {
        assert.isFalse(key.includes("undefined")); //make sure no undefined in arns
      }
    }
    console.log('getFunctionActionMapFromXray results: ', map);
  });

  it('parseXrayTrace should parse xray trace', function() {
    const map: FunctionToActionsMap = new Map();    
    const res = parseXrayTrace(TRACE1, map);
    assert.equal(res.size, 1);
    console.log("trace parse result: ", res);
  });

  it('parseXrayTrace should parse xray trace2 with local segment', function() {
    const map: FunctionToActionsMap = new Map();    
    const res = parseXrayTrace(TRACE2, map);
    assert.equal(res.size, 1);
    console.log("trace2 parse result: ", res);
    for (const entry of res.entries()) {
      assert.isTrue(entry[0].endsWith('create-func'));
      const resource = 'arn:aws:dynamodb:us-east-2:*:table/test_table';      
      const actions = entry[1].get(resource);
      assert.isNotEmpty(actions);
      assert.isTrue(actions!.has('PutItem'));
    }
  });

  it('createIAMPolicyDoc creates proper policy action', function() {
    const map = new ResourceActionMap();
    //empty should add a "Note" to the description
    let doc = createIAMPolicyDoc(map, "arn:aws:lambda:us-east-1:11223344:function:test");
    assert.isTrue(doc.Description!.indexOf("Note: ") > 0);
    map.set("arn:aws:s3:::test-bucket/*", new Set(['PutObjectTagging', 'GetObject', 'DeleteObject', 'PutObject']));
    map.set("arn:aws:s3:::test-again/*", new Set(['PutObjectTagging', 'GetObject', 'DeleteObject', 'PutObject']));
    map.set("arn:aws:dynamodb:us-east-1:*:table/test-it", new Set(['DeleteItem', 'PutItem', 'Scan', 'GetItem']));
    doc = createIAMPolicyDoc(map, "arn:aws:lambda:us-east-1:11223344:function:test");
    assert.isNotEmpty(doc.Statement);
    assert.equal(doc.Statement!.length, 2);
    assert.isNotEmpty(doc.Statement![0].Action);
    assert.isTrue(doc.Statement![0].Action!.indexOf('s3:PutObjectTagging') >= 0);
    assert.isTrue(doc.Statement![0].Resource!.length === 2 || doc.Statement![1].Resource!.length === 2);
    // console.log('createIAMPolicyDoc:\n%s', JSON.stringify(doc, undefined, 2));
  });

  it('scanXray should return policies and comparison', async function() {
    const conf: ScanXrayTracesConf = {
      startTime: new Date(1517785998000),
      timeRangeMinutes: 5,
      compareExistingRole: true,
    };
    const res = await scanXray(conf);
    assert.equal(res.GeneratedPolicies.length, 5); 
    assert.equal(res.ExcessPermissions.length, 5);
    //verify that excess permission for update doesn't contain UpdateItem
    const updateExcess = res.ExcessPermissions.find((e) => e.arn.endsWith('-update'));
    assert.isNotEmpty(updateExcess);
    assert.isUndefined(updateExcess!.excessPermissions.find((p) => (p.Action! as string[]).find((s) => s.endsWith('UpdateItem')) !== undefined));
    // console.log('compare res: ', JSON.stringify(res.ExcessPermissions, undefined, 2));
  });

  it('scanXray SNS should return policies and comparison', async function() {
    const conf: ScanXrayTracesConf = {
      startTime: new Date(1520850322000),
      timeRangeMinutes: 120,
      compareExistingRole: true,
    };
    const res = await scanXray(conf);
    assert.equal(res.GeneratedPolicies.length, 1); 
    assert.equal(res.ExcessPermissions.length, 1);
    //verify that excess permission contains sns:*
    const snsExcess = res.ExcessPermissions[0].excessPermissions.find((p) => isArray(p.Action) && ((p.Action! as string[]).find((s) => s === 'sns:*') !== undefined));
    assert.isNotEmpty(snsExcess);
    //policy should contain 2 statements
    assert.equal(res.GeneratedPolicies[0].Policy.Statement!.length, 2);
    const statementResourceSpecific = res.GeneratedPolicies[0].Policy.Statement!.find((s) => isArray(s.Resource) && s.Resource[0].endsWith('test-topic'));
    assert.isTrue((statementResourceSpecific!.Action! as string[]).find((a) => a.endsWith("ListSubscriptionsByTopic")) !== undefined);
    const statementGlobal = res.GeneratedPolicies[0].Policy.Statement!.find((s) => isArray(s.Resource) && s.Resource[0].endsWith(':*'));
    assert.isTrue((statementGlobal!.Action! as string[]).find((a) => a.endsWith("ListTopics")) !== undefined);
    // console.log('compare res: ', JSON.stringify(res.ExcessPermissions, undefined, 2));
  });

});
