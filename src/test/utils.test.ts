import {assert} from 'chai';
import { extractRegion } from '../main/aws-segments/utils';

describe('util test', function() {

  it('extract region from lambda arn', function() {
    const region = extractRegion("arn:aws:lambda:us-east-1:112233445566:function:java-test-dev-hello");
    assert.equal(region, "us-east-1");
  });

});
