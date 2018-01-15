AWS Least Privilege
===================

Use AWS X-Ray to reach Least Privilege.

This project aims to streamline the process of collecting resource usage information from X-Ray and reaching a "Least Privilege" security posture for a given application. AWS X-Ray provides in-depth information about service API calls executed via the AWS SDK. Using this information, it is possible to build a profile of the AWS resources and actions that are actually used by an application and generate a policy document reflecting it.  The project is currently focused on AWS Lambda but can easily be applied to other applications that utilize AWS Roles (applications on EC2 or ECS).

# Installation

```
npm install -g aws-least-privilege
```

This will install the command line tool: `xray-privilege-scan`.

# Credential Setup

The cli tool uses AWS Nodejs SDK internally and will use the same credential mechanism as used by the SDK. It will automatically use credentials from the AWS shared credential file. See: [AWS SDK Docs](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html) for more details. The user used to run the cli should have the AWS managed policy: `AWSXrayReadOnlyAccess`. 

# X-Ray Setup

Follow the [AWS X-Ray Developer Guide](https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html) to install and enable X-Ray for your application.

## X-Ray Parameter Whitelist Configuration

In order to capture what resources are accessed by AWS service calls, AWS X-Ray needs to be configured to send out parameter information as part of the subsegment traces. For example for DynamoDB we would want to know the Table being accessed and for S3 the Bucket and Key. AWS X-Ray currently provides default parameter info only for a limited set of services: DynamoDB, SQS, and Lambda. X-Ray does provide support for configuring additional services (such as S3) to include parameter info through a parameter whitelist configuration file. We've created separate projects to manage parameter whitelist configurations for the Java and Node X-Ray SDKs. 

### X-Ray SDK for Node

Install the npm module providing additional whitelist configurations:

```
npm install --save aws-xray-parameter-whitelist
```

Then during the initialization of your application add the following configuration code:

```
const AWSXRay = require('aws-xray-sdk');
const whitelists = require('aws-xray-parameter-whitelist');
AWSXRay.appendAWSWhitelist(whitelists.s3_whitelist)
```

More info available at the project page: https://github.com/functionalone/aws-xray-parameter-whitelist-node 

### X-Ray SDK for Java

Use the `aws-xray-parameter-whitelist-instrumentor` jar which is a drop-in replacement for `aws-xray-recorder-sdk-aws-sdk-instrumentor`. It contains a pre-configured parameter whitelist file with additional support for S3. There is no need to modify source code to use this parameter whitelist configuration. There is only need to add the jar to the class path instead of the `aws-xray-recorder-sdk-aws-sdk-instrumentor` jar. It is possible to add the `aws-xray-parameter-whitelist-instrumentor` jar as a dependency via the JCenter repository. For example, if you are using Gradle you will need to add the following section to the repositories closure:

```
repositories {
    jcenter()
}
```

And then add the following compilation dependency:
```
compile 'com.github.functionalone:aws-xray-parameter-whitelist-instrumentor:<version>'
```

More info and further configuration options are available at the project page: https://github.com/functionalone/aws-xray-parameter-whitelist-java

# Usage and command line options

To list all the options run:

`xray-privilege-scan --help`

All command line options are optional:

```
  Usage: xray-privilege-scan [options]


  Options:

    -V, --version                 output the version number
    -s, --start-time <timestamp>  Start time as Unix timestamp (seconds since 1970-01-01 00:00:00 UTC). If left out will use: (current time - time range).
    -r, --time-range <minutes>    Time range in minutes to scan from start time. (default: 60)
    -v, --verbose                 Output verbose logs to the console (info and above).
    -h, --help                    output usage information
```

Example usage to scan last 12 hours of X-Ray traces with verbose output:

```
xray-privilege-scan -v -r 720
```

Once completed `xray-privilege-scan` will generate a policy document per Lambda Function. Each document will be named with a unique id of the form:

`0fcacc5b207ffcd533267d2020962975.policy.json`

Additionally it will printout a summary to standard out specifying the function names and documents generated. 

The policy document is a json document conforming to the AWS Policy language with an additional field of: `Description`. The `Description` field will contain the AWS ARN of the Lambda Function this policy is for. The `Description` field is not part of the AWS Policy language and should be removed if copying the policy to AWS IAM.


