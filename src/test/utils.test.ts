import {assert} from 'chai';
import { extractRegion, extractRegionFromUrl } from '../lib/aws-segments/utils';

describe('util test', function() {

  it('extract region from lambda arn', function() {
    const region = extractRegion("arn:aws:lambda:us-east-1:112233445566:function:java-test-dev-hello");
    assert.equal(region, "us-east-1");
  });

  it('extract region from url', function() {
    const region = extractRegionFromUrl('https://sqs.us-east-1.amazonaws.com/1111111111/test-msg-queue');
    assert.equal(region, "us-east-1");
  });

});
