# How to develop openshift-vsts

<!-- TOC depthFrom:2 -->

- [Prerequisites](#prerequisites)
- [Build tasks](#build-tasks)
    - [Transpile TypeScript to JavaScript](#transpile-typescript-to-javascript)
    - [Build VSTS extension](#build-vsts-extension)
- [Test](#test)
- [Debug](#debug)
- [Publish](#publish)
    - [Staging](#staging)
    - [Production](#production)
- [References](#references)

<!-- /TOC -->

## Prerequisites

- Install [Node.js](https://nodejs.org/en/)
- Run npm setup script

    `> npm run setup`

## Build tasks

The various build tasks are driven via `npm`.
Check the _package.json_ files for the defined run scripts.
To get a list of all available tasks run:

`> npm run`

### Transpile TypeScript to JavaScript

`> npm run build`

Either from the top level directory or from within each task.
To watch your TypeScript files for changes and transpile on the fly:

`> npm run watch`

### Build VSTS extension

`> npm run extension:create`

This will also bump the version numbers of the extensions as well as all tasks.

## Test

Test are written using [mocha](https://mochajs.org/) and live in the *_tests_* subdirectory of the corresponding task. You can run the tests via:

`> npm test`

You can get an HTML version of the test results into the _out_ directory by running:

`> npm test:report`

## Debug

Assuming you are using Visual Studio Code, the following _launch.json_ allows you to debug your TypeScript file:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Launch oc cmd",
            "program": "${workspaceFolder}/tasks/oc-cmd/src/task.ts",
            "env": {"SYSTEM_DEFAULTWORKINGDIRECTORY":"${workspaceFolder}/tasks/oc-cmd/out"},
            "outFiles": [
                "${workspaceFolder}/tasks/oc-cmd/lib/*.js"
            ],
            "outputCapture": "std"
        },
        {
            "type": "node",
            "request": "launch",
            "name": "Mocha oc cmd",
            "program": "${workspaceFolder}/tasks/oc-cmd/node_modules/.bin/ts-mocha",
            "args": [
                "-p",
                "${workspaceFolder}/tasks/oc-cmd/tsconfig.json",
                "--timeout",
                "999999",
                "--colors",
                "${workspaceFolder}/tasks/oc-cmd/src/tests/*.ts",
            ],
            "internalConsoleOptions": "neverOpen",
            "protocol": "inspector"
        }
    ]
}
```

## Publish

Prerequisite is a [personal access token](https://docs.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=vsts#acquire-the-tfs-cross-platform-command-line-interface).

### Staging

Do do a staging deploy you can specify a staging publisher by setting the `DEV_PUBLISHER` environment variable:

```bash
> export TOKEN=<token>
> export DEV_PUBLISHER=<stage/test publisher>
> npm run clean
> npm run build
> npm run extension:create:dev
> npm run extension:publish:dev
```

Once the extension is installed, you can share it with a given user:

```bash
> export EXT_SHARES=<comma seperated list of users to share with>
> export DEV_PUBLISHER=<stage/test publisher>
> npm run extension:share:dev
```

To unshare:

```bash
> export EXT_SHARES=<comma seperated list of users to share with>
> export DEV_PUBLISHER=<stage/test publisher>
> npm run extension:unshare:dev
```

### Production

Do do a production deploy under the [Red Hat Publisher](https://marketplace.visualstudio.com/manage/publishers/redhat):

```bash
> export TOKEN=<token>
> npm run clean
> npm run build
> npm run extension:create
> npm run extension:publish
```

## References

- Microsoft's [Develop Extensions](https://docs.microsoft.com/en-us/azure/devops/extend/?view=vsts) guide
- [Getting Started](https://docs.microsoft.com/en-us/azure/devops/extend/get-started/node?view=vsts)
- [Tutorials](https://docs.microsoft.com/en-us/azure/devops/extend/get-started/tutorials?view=vsts)
  - [Available pipeline environment variables](https://docs.microsoft.com/en-us/azure/devops/pipelines/build/variables?view=vsts)
  - [Publish from the command line](https://docs.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=vsts)
- [vsts-task-lib TypeScript API](https://github.com/Microsoft/vsts-task-lib/blob/master/node/docs/vsts-task-lib.md#toolrunnerToolRunnerargIf)
- Microsoft's [Azure Pipelines tasks](https://github.com/Microsoft/vsts-tasks)
- [Step by Step: Node Task with Typescript API](https://github.com/Microsoft/vsts-task-lib/blob/master/node/docs/stepbystep.md)
- [How to Use npm as a Build Tool](https://www.keithcirkel.co.uk/how-to-use-npm-as-a-build-tool)
- [Use Git within a pipeline scrfipt task](https://docs.microsoft.com/en-us/azure/devops/pipelines/scripts/git-commands?view=vsts&tabs=yaml)
