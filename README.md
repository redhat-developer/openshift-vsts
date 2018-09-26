# OpenShift TFS/VSTS Marketplace Extension

<!-- TOC -->

- [OpenShift TFS/VSTS Marketplace Extension](#openshift-tfsvsts-marketplace-extension)
- [What is it?](#what-is-it)
- [How to develop](#how-to-develop)
    - [Prerequisites](#prerequisites)
    - [Build](#build)
    - [Test](#test)
    - [Publish](#publish)
- [How to contribute?](#how-to-contribute)
- [References](#references)

<!-- /TOC -->


# What is it?

OpenShift Marketplace Extension for Azure DevOps (formerly VSTS).

# How to develop

## Prerequisites

* Install NPM / Node.js
* `> npm install vss-web-extension-sdk`
* `> npm i -g tfx-cli`

## Build 

`> tfx extension create`

## Test

`> npm test`

## Publish

Prerequisite is a [personal access token](https://docs.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=vsts#acquire-the-tfs-cross-platform-command-line-interface).

```
> export TOKEN=<token>
> tfx extension publish --share-with hardy0575 --token $TOKEN --rev-version
```

# How to contribute?

If you want to contribute, make sure to follow the [contribution guidelines](./CONTRIBUTING.md) when you open issues or submit pull requests.

# References

* [Develop a web extension for Azure DevOps Services](https://docs.microsoft.com/en-us/azure/devops/extend/get-started/node?view=vsts)
* [Tutorials for developing Azure DevOps Services extensions](https://docs.microsoft.com/en-us/azure/devops/extend/get-started/tutorials?view=vsts)
* [Publish from the command line](https://docs.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=vsts)
* [Step by Step: Node Task with Typescript API](https://github.com/Microsoft/vsts-task-lib/blob/master/node/docs/stepbystep.md)
