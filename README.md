# OpenShift Extension for Azure DevOps

| System                                                                                                  | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build ([master](https://github.com/redhat-developer/openshift-vsts/tree/master) branch)                          | ![OpenShift VSTS Build](https://github.com/redhat-developer/openshift-vsts/workflows/OpenShift%20VSTS%20CI/badge.svg?branch=master) |
| [Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.openshift-vsts) | [![Visual Studio Marketplace](https://vsmarketplacebadge.apphb.com/version/redhat.openshift-vsts.svg)](https://marketplace.visualstudio.com/items?itemName=redhat.openshift-vsts) 

## What is it

The OpenShift Extension for Azure DevOps offers tasks for integrating [OpenShift](https://github.com/openshift/origin) into your Azure DevOps build and release pipelines, for example by executing user defined `oc` commands.

The extension is distributed via the [Azure DevOps Marketplace](https://marketplace.visualstudio.com/azuredevops) and can be found [here](https://marketplace.visualstudio.com/items?itemName=redhat.openshift-vsts).

## Getting Started

Below you can find a collection of resources to better undestand how the extension works.

* [Getting Started](./docs/getting-started.md)
* [Blog on developers.redhat.com](https://developers.redhat.com/blog/2019/12/05/introduction-to-the-red-hat-openshift-deployment-extension-for-microsoft-azure-devops/)
* [Demo Video](https://www.youtube.com/watch?v=RBwpedmkvow)

## Known Issue

New version 2.0.13 changed all the tasks definitions. This might cause old pipelines, created using plugin 2.0.12 or older, to fail during execution. The issue can be easily solved by load, modify (any irrelevant change is good enough) and save the old pipeline so new definition is created and saved. [#170](https://github.com/redhat-developer/openshift-vsts/issues/170) Thanks to Ludovit Varga.

## How to contribute

If you want to contribute, make sure to follow the [contribution guidelines](./CONTRIBUTING.md) when you open issues or submit pull requests.

You find all the information you need to get coding in the [Development](./docs/development.md) documentation.

