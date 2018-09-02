# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.1.12"></a>
## [0.1.12](https://github.com/functionalone/aws-least-privilege/compare/v0.1.11...v0.1.12) (2018-09-02)


### Features

* update dependencies ([4c2fe0b](https://github.com/functionalone/aws-least-privilege/commit/4c2fe0b))



<a name="0.1.11"></a>
## [0.1.11](https://github.com/functionalone/aws-least-privilege/compare/v0.1.10...v0.1.11) (2018-06-05)


### Features

* support travis build and coverage reporting ([fc82935](https://github.com/functionalone/aws-least-privilege/commit/fc82935))
* update dependencies ([08838ce](https://github.com/functionalone/aws-least-privilege/commit/08838ce))



<a name="0.1.10"></a>
## [0.1.10](https://github.com/functionalone/aws-least-privilege/compare/v0.1.9...v0.1.10) (2018-04-26)


### Features

* add aditional note about X-Ray configuration when generated policy is empty ([feebd1f](https://github.com/functionalone/aws-least-privilege/commit/feebd1f))



<a name="0.1.9"></a>
## [0.1.9](https://github.com/functionalone/aws-least-privilege/compare/v0.1.8...v0.1.9) (2018-03-20)


### Bug Fixes

* fixed issue where subsegments were not parsed when there was a custom local segment ([6632d7c](https://github.com/functionalone/aws-least-privilege/commit/6632d7c))



<a name="0.1.8"></a>
## [0.1.8](https://github.com/functionalone/aws-least-privilege/compare/v0.1.7...v0.1.8) (2018-03-12)


### Features

* support for sns (issue [#1](https://github.com/functionalone/aws-least-privilege/issues/1)) ([ee16055](https://github.com/functionalone/aws-least-privilege/commit/ee16055))



<a name="0.1.7"></a>
## [0.1.7](https://github.com/functionalone/aws-least-privilege/compare/v0.1.6...v0.1.7) (2018-02-21)


### Features

* support passing filter expression to use when scanning xray traces ([2d304c0](https://github.com/functionalone/aws-least-privilege/commit/2d304c0))



<a name="0.1.6"></a>
## [0.1.6](https://github.com/functionalone/aws-least-privilege/compare/v0.1.5...v0.1.6) (2018-02-06)


### Features

* Support new "compare mode". Allows comparing the X-Ray discovered permissions against the current permissions assigned to a Lambda Function. ([335b116](https://github.com/functionalone/aws-least-privilege/commit/335b116))



<a name="0.1.5"></a>
## [0.1.5](https://github.com/functionalone/aws-least-privilege/compare/v0.1.4...v0.1.5) (2018-01-21)


### Features

* support for extracting Lambda actions from traces ([a178dfb](https://github.com/functionalone/aws-least-privilege/commit/a178dfb))
* support for extracting SQS actions from traces ([6a109e7](https://github.com/functionalone/aws-least-privilege/commit/6a109e7))
