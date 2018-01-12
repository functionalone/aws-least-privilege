AWS Least Privilege
===================

Use AWS X-Ray to reach Least Privilege.

This project aims to streamline the process of collecting resource usage information from X-Ray and reaching a "Least Privilege" security posture for a given application. AWS X-Ray provides in-depth information about service API calls executed via the AWS SDK. Using this information, it is possible to build a profile of the AWS resources and actions that are actually used by an application and generate a policy document reflecting it.  The project is currently focused on AWS Lambda but can easily be applied to other applications that utilize AWS Roles (applications on EC2 or ECS).

## Installation

```
npm install -g aws-least-privilege
```

## Credential Setup

xray-privilege-scan uses the AWS Nodejs SDK internally and will use the same credential mechanism as used by the SDK. It will automatically use credentials from the AWS shared credential file. See: [AWS SDK Docs](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html) for more details. The user used to run xray-privilege-scan should have the AWS managed policy: `AWSXrayReadOnlyAccess`. 

## Usage and command line options

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


