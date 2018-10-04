# How to develop openshift-vsts

<!-- TOC -->

- [How to develop openshift-vsts](#how-to-develop-openshift-vsts)
    - [Prerequisites](#prerequisites)
    - [Build tasks](#build-tasks)
        - [Transpile TypeScript to JavaScript](#transpile-typescript-to-javascript)
        - [Build VSTS extension](#build-vsts-extension)
    - [Test](#test)
    - [Debug](#debug)
    - [Publish](#publish)
    - [References](#references)

<!-- /TOC -->

## Prerequisites

* Install [Node.js](https://nodejs.org/en/)
* Install the Azure DevOps CLI
        
    `> npm install -g tfx-cli`

* Install TypeScript

    `> npm install -g typescript`

You can also run `npm run setup` to install `tfx-cli` and `typescript`

## Build tasks

The various build tasks are driven via `npm`.
Check the _package.json_ files for the defined run scripts.
To get a list of all a available tasks run:

`> npm run`

### Transpile TypeScript to JavaScript

`> npm run build`

Either from the top level directory or from within each task.
To watch your TypeScript files for changes and transpile on the fly:

`> npm run watch`

### Build VSTS extension

`> npm run vsix`

## Test

Test are written using [mocha](https://mochajs.org/) and live in the *_tests_* subdirectory of the corresponding task. You can run the tests via:

`> npm test`

## Debug

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
            "name": "Launch oc install",
            "program": "${workspaceFolder}/tasks/oc-install/task.ts",
            "env": {"SYSTEM_DEFAULTWORKINGDIRECTORY":"${workspaceFolder}/tasks/oc-install/out"},
            "outFiles": [
                "${workspaceFolder}/tasks/oc-install/*.js"
            ],
            "outputCapture": "std"
        },
        {
            "type": "node",
            "request": "launch",
            "name": "Mocha Tests oc install",
            "program": "${workspaceFolder}/tasks/oc-install/node_modules/mocha/bin/_mocha",
            "args": [
                "-u", "tdd",
                "--timeout", "999999",
                "--colors", "--recursive",
                "${workspaceFolder}/tasks/oc-install/tests/**/*.ts"
            ],
            "internalConsoleOptions": "openOnSessionStart"
        }
    ]
}
```

## Publish

Prerequisite is a [personal access token](https://docs.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=vsts#acquire-the-tfs-cross-platform-command-line-interface).

```
> export TOKEN=<token>
> export SHARE_WITH=<project-id>
> npm run publish
```

## References

* [Develop a web extension for Azure DevOps Services](https://docs.microsoft.com/en-us/azure/devops/extend/get-started/node?view=vsts)
* [Tutorials for developing Azure DevOps Services extensions](https://docs.microsoft.com/en-us/azure/devops/extend/get-started/tutorials?view=vsts)
* [Publish from the command line](https://docs.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=vsts)
* [Step by Step: Node Task with Typescript API](https://github.com/Microsoft/vsts-task-lib/blob/master/node/docs/stepbystep.md)
* [How to Use npm as a Build Tool](https://www.keithcirkel.co.uk/how-to-use-npm-as-a-build-tool)
