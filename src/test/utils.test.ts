import {assert} from 'chai';
import { extractRegion, extractRegionFromUrl, startsWithAny, removeAccountIdFromArn } from '../lib/aws-segments/utils';

describe('utils test', function() {

  it('extract region from lambda arn', function() {
    const region = extractRegion("arn:aws:lambda:us-east-1:112233445566:function:java-test-dev-hello");
    assert.equal(region, "us-east-1");
  });

  it('extract region from url', function() {
    const region = extractRegionFromUrl('https://sqs.us-east-1.amazonaws.com/1111111111/test-msg-queue');
    assert.equal(region, "us-east-1");
  });

  it('#startWithAny check', function() {
    const res = startsWithAny("dynamodb:GetItem", ["s3", "dynamodb", "sqs"]);
    assert.equal(res, "dynamodb");
  });

  it('#removeAccountIdFromArn check', () => {
    const s3arn = 'arn:aws:s3:::test-bucket/*';
    assert.equal(removeAccountIdFromArn(s3arn), s3arn);
    assert.equal(removeAccountIdFromArn('arn:aws:dynamodb:us-east-1:123456789:table/*'), 'arn:aws:dynamodb:us-east-1:*:table/*');
  });

});
