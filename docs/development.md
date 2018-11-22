# How to develop openshift-vsts

<!-- MarkdownTOC autolink="true" autoanchor="true" -->

- [Prerequisites](#prerequisites)
- [npm build tasks](#npm-build-tasks)
	- [Transpile](#transpile)
	- [Test](#test)
	- [Create extension](#create-extension)
	- [Publish extension](#publish-extension)
		- [To staging](#to-staging)
		- [To production](#to-production)
	- [Write docs](#write-docs)
- [References](#references)

<!-- /MarkdownTOC -->

<a id="prerequisites"></a>
## Prerequisites

- Install [Node.js](https://nodejs.org/en/)
- Run npm setup script

    `> npm run setup`

<a id="npm-build-tasks"></a>
## npm build tasks

The various build tasks are driven via `npm`.
Check [_package.json_](https://github.com/redhat-developer/openshift-vsts/blob/master/package.json) for the defined run scripts.
To get a list of all available tasks run:

`> npm run`

<a id="transpile"></a>
### Transpile

To transpile TypeScript to JavaScript:

`> npm run build`

To watch your TypeScript files for changes and transpile on the fly:

`> npm run build:watch`

<a id="test"></a>
### Test

Test are written using [mocha](https://mochajs.org/) and live in the *_test_* directory of the checkout. You can run the tests via:

`> npm test`

There are a couple of test which go over the network and access the GitHub API.
You can exclude them by setting the `MOCHA_TAG` environment variable like so:

`MOCHA_TAG='--grep @network --invert' npm run test`

For more information regarding test tagging refer to Mocha's [Tagging](https://github.com/mochajs/mocha/wiki/Tagging) documenttion.

You can get an HTML version of the test results into the _out_ directory by running:

`> npm test:report`

If you are running the tests a lot, you might reach the GitHub API rate limit.
In this case you can create a [GitHub access token](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line) and export it under the environment variable `GITHUB_ACCESS_TOKEN`.

<a id="create-extension"></a>
### Create extension 

To create the extension (vsix file): 

`> npm run extension:create`

To create the extension for a deploy to a staging publisher:

`> npm run extension:create:dev`

During development it can be handy to push patch releases to a test publisher.
The following command will create the extension bumping the version of the extension as well as all as the versions of all tasks:

`> npm run extension:create:patch`


<a id="publish-extension"></a>
### Publish extension

Prerequisite for publishing from the command line is a [personal access token](https://docs.microsoft.com/en-us/azure/devops/extend/publish/command-line?view=vsts#acquire-the-tfs-cross-platform-command-line-interface).
Once you have setup your token, you can chose to publish to a test/staging publisher or the production publisher 'redhat'.

<a id="to-staging"></a>
#### To staging

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

<a id="to-production"></a>
#### To production

Do do a production deploy under the [Red Hat](https://marketplace.visualstudio.com/manage/publishers/redhat) publisher follow these steps.
They need to be executed from the _master_ branch. 

```bash
> export TOKEN=<token>
> npm run clean
> npm install
> npm run test
> EXT_VERSION=<version> npm run extension:version:set
> npm run extension:create
> npm run extension:publish
> npm run extension:publish:commit
```

You need to be member of this publisher!

<a id="write-docs"></a>
### Write docs

To write on the docs you can leverage [markserv](https://www.npmjs.com/package/markserv) npm, rendering and updating the docs as you go.
Just run:

```bash
> npm run docs
```

<a id="references"></a>
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
- [Use Git within a pipeline script task](https://docs.microsoft.com/en-us/azure/devops/pipelines/scripts/git-commands?view=vsts&tabs=yaml)
