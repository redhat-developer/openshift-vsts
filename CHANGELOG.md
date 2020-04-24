# Change Log

## 1.6.0 (April 24, 2020)

* [#151](https://github.com/redhat-developer/openshift-vsts/pull/153) Added cache support
* [#152](https://github.com/redhat-developer/openshift-vsts/issues/152) Added new task to perform conditional commands
* [#160](https://github.com/redhat-developer/openshift-vsts/pull/160) Added support for command interpolation
* [#146](https://github.com/redhat-developer/openshift-vsts/issues/146) Added support to define connection config at runtime
* [#165](https://github.com/redhat-developer/openshift-vsts/pull/165) Updated oc versions file
* [#156](https://github.com/redhat-developer/openshift-vsts/pull/156) Refactor how errors are handled by extension
* [#158](https://github.com/redhat-developer/openshift-vsts/pull/158) Switched from Azure pipelines to Github Actions

Thanks to Rinor Maloku for his contribution

## 1.5.0 (February 17, 2020)

* [#135](https://github.com/redhat-developer/openshift-vsts/issues/135) Added proxy support
* [#130](https://github.com/redhat-developer/openshift-vsts/issues/130) Added support for pipes and redirector operators
* [#136](https://github.com/redhat-developer/openshift-vsts/issues/136) Fixed issue when typing oc version in format x.xx
* [#142](https://github.com/redhat-developer/openshift-vsts/issues/142) Moved to eslint

## 1.4.2 (December 3, 2019)

This release brings to you: 
* [#120](https://github.com/redhat-developer/openshift-vsts/issues/120) Added Certificate Authority flag to connect to Openshift by using an exteral certificate authority file
* [#124](https://github.com/redhat-developer/openshift-vsts/issues/124) Exported constants to external JSON file

## 1.4.1 - (November 20, 2019) 

* Updated marketplace description/fixed wrong links

## 1.4.0 - (November 12, 2019) 

This release brings to you:

* [#46](https://github.com/redhat-developer/openshift-vsts/issues/46) Added new flag to ignore non success return value
* [#97](https://github.com/redhat-developer/openshift-vsts/issues/97) Check if oc cli already exists locally and prevent from downloading new version
* [#115](https://github.com/redhat-developer/openshift-vsts/issues/115) Changed way oc cli is downloaded. Now extension uses mirror.openshift.com
* [#99](https://github.com/redhat-developer/openshift-vsts/issues/99) Added new Azure Devops badge
* [#96](https://github.com/redhat-developer/openshift-vsts/issues/96) Changed way to create download directory 
* [#75](https://github.com/redhat-developer/openshift-vsts/pull/98) Use sinon to make test and preventing downloading useless archive
* [#104](https://github.com/redhat-developer/openshift-vsts/issues/104) Create Jenkins task to publish new version into marketplace
* [#74](https://github.com/redhat-developer/openshift-vsts/issues/74) Updated Azure Devops CI to work on all Oses
