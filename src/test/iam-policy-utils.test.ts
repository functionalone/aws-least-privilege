import {assert} from 'chai';
import { IamStatement } from '../lib/aws-segments/iam-policy';
import { IamPolicyUtils } from '../lib/iam-policy-utils';
import * as _ from 'lodash';
// import * as fs from 'fs';
import * as nock from 'nock';

describe('iam-policy-utils', function() {  

  this.timeout(60000);

  let iamUtils: IamPolicyUtils;

  before(() => {
    nock.load('src/test/iam-policy-utils.nock.json');
    // nock.recorder.rec({
    //   output_objects: true,
    // });
    iamUtils = new IamPolicyUtils();
  });

  // after(() => {
  //   const nockRec = nock.recorder.play();
  //   fs.writeFileSync('nock.rec.json', JSON.stringify(nockRec, undefined, 2));
  // });

  it('#createPolicyMapped creates proper maps', () => {
    const statements: IamStatement[] = [
      {
        Action: '*',
        Resource: 'arn:aws:dynamodb:us-east-1:*:table/test',
        Effect: 'Allow',
      },
      {
        Action: 's3:GetObject',
        Resource: ['arn:aws:s3:::test-bucket/*', 'arn:aws:s3:::test-bucket2/*'],
        Effect: 'Allow',
      },
      {
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::test-bucket3/*',
        Effect: 'Allow',
      },
      {
        Action: 's3:PutObject',
        Resource: 'arn:aws:s3:::test-bucket/*',
        Effect: 'Allow',
      },
      {
        Action: ['s3:GetObject', 'dynamodb:GetItem'],
        Resource: ['*'],
        Effect: 'Allow',
      },
    ];
    const mapped = iamUtils.createPolicyActionMap(statements);
    assert.deepEqual(Array.from(mapped.get('*')!.values()), ['arn:aws:dynamodb:us-east-1:*:table/test']);
    assert.equal(mapped.get('s3:GetObject')!.size, 4);        
  });

  it('#checkExcessPolicyPermissions finds excess permissions', () => {
    const effective: IamStatement[] = [
      {
        Action: [
          "xray:PutTelemetryRecords",
          "xray:PutTraceSegments",
        ],
        Resource: "*",
        Effect: "Allow",
      },
      {
        Action: '*',
        Resource: 'arn:aws:dynamodb:us-east-1:*:table/test',
        Effect: 'Allow',
      },
      {
        Action: 'dynamodb:*',
        Resource: '*',
        Effect: 'Allow',
      },
      {
        Action: 's3:GetObject',
        Resource: ['arn:aws:s3:::test-bucket/*', 'arn:aws:s3:::test-bucket2/*'],
        Effect: 'Allow',
      },
      {
        Action: 's3:PutObject',
        Resource: 'arn:aws:s3:::test-bucket/*',
        Effect: 'Allow',
      },      
    ];
    const desired: IamStatement[] = [
      {
        Action: 'dynamodb:Query',
        Resource: 'arn:aws:dynamodb:us-east-1:*:table/test',
        Effect: 'Allow',
      },
      {
        Action: 's3:GetObject',
        Resource: ['arn:aws:s3:::test-bucket/*'],
        Effect: 'Allow',
      },
      {
        Action: 's3:PutObject',
        Resource: 'arn:aws:s3:::test-bucket/*',
        Effect: 'Allow',
      },      
    ];
    const compareResult = iamUtils.checkExcessPolicyPermissions(effective, desired);
    assert.isNotEmpty(compareResult);
    assert.isNotEmpty(compareResult!.find((r) => {      
      return (r.Action === 's3:GetObject' || _.isArray(r.Action) && r.Action!.find((a) => a === 's3:GetObject') !== undefined) && 
        (_.isString(r.Resource) || (_.isArray(r.Resource) && r.Resource.length === 1));
    }), 's3:GetObject contains 1 excessive resource');    
  });

  it('#getCombinedStatementsForRole returns all statements', async () => {
    const statements = await iamUtils.getCombinedStatementsForRole('TestRoleForAWSLeastPriv');
    console.log('statements: ', statements);
    assert.equal(statements.length, 3);
  });

});
