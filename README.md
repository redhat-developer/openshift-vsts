# OpenShift TFS/VSTS Marketplace Extension 

[![Build Status](https://travis-ci.org/hferentschik/openshift-vsts.svg?branch=master)](https://travis-ci.org/hferentschik/openshift-vsts)

<!-- TOC -->

- [OpenShift TFS/VSTS Marketplace Extension](#openshift-tfsvsts-marketplace-extension)
- [What is it?](#what-is-it)
- [How to develop](#how-to-develop)
    - [Prerequisites](#prerequisites)
    - [Build](#build)
        - [Build JavaScript](#build-javascript)
        - [Build VSTS extension](#build-vsts-extension)
        - [Debug](#debug)
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
* Install the Azure DevOps CLI
        
    `> npm install -g tfx-cli`

* Install TypeScript

    `> npm install -g typescript`

## Build 

The various build tasks are driven via `npm`.
To get a list of all a available tasks run:

`> npm run`

### Build JavaScript

`> npm run build`

Either from the top level directory or from within each task.
Check the _package.json_ files for the defined run scripts.

To watch your TypeScript files for changes and traspile on the fly:

`> npm run watch`

### Build VSTS extension

`> npm run vsix`

### Debug

Assuming you are using Visual Studio Code, the following _launch.json_ will allow you to debug your TypeScript file:

```
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "program": "${workspaceFolder}/tasks/oc-install/oc-install.ts",
            "env": {"SYSTEM_DEFAULTWORKINGDIRECTORY":"${workspaceFolder}/tasks/oc-install/out"},
            "outFiles": [
                "${workspaceFolder}/tasks/oc-install/*.js"
            ],
            "outputCapture": "std"
        }
    ]
}
```

## Test

`> npm test`

## Publish

Prerequisite is a [personal access token](https://docs.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=vsts#acquire-the-tfs-cross-platform-command-line-interface).

```
> export TOKEN=<token>
> export SHARE_WITH=<project-id>
> npm run publish
```

# How to contribute?

If you want to contribute, make sure to follow the [contribution guidelines](./CONTRIBUTING.md) when you open issues or submit pull requests.

# References

* [Develop a web extension for Azure DevOps Services](https://docs.microsoft.com/en-us/azure/devops/extend/get-started/node?view=vsts)
* [Tutorials for developing Azure DevOps Services extensions](https://docs.microsoft.com/en-us/azure/devops/extend/get-started/tutorials?view=vsts)
* [Publish from the command line](https://docs.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=vsts)
* [Step by Step: Node Task with Typescript API](https://github.com/Microsoft/vsts-task-lib/blob/master/node/docs/stepbystep.md)
* [How to Use npm as a Build Tool](https://www.keithcirkel.co.uk/how-to-use-npm-as-a-build-tool)
