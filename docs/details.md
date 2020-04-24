# OpenShift Extension for Azure DevOps

[![Build Status](https://travis-ci.org/redhat-developer/openshift-vsts.svg?branch=master)](https://travis-ci.org/redhat-developer/openshift-vsts) ![OpenShift VSTS Build](https://github.com/redhat-developer/openshift-vsts/workflows/OpenShift%20VSTS%20CI/badge.svg?branch=master)

This Azure DevOps extension offers tasks for integrating [OpenShift](https://github.com/openshift/origin) into your build and release pipelines, for example by executing user defined `oc` commands.

Refer to the [Get Started](https://github.com/redhat-developer/openshift-vsts/blob/master/docs/getting-started.md) guide to see the full list of tasks and how to use them.

**NOTE:** This Azure DevOps extension assumes that cURL is already installed on the Agent that is running the build. If cURL is not located on the Agent, an error will be thrown, and the task will fail.

This extension is currently in preview state. 
We are looking forward to your feedback, either on the [Marketplace](https://marketplace.visualstudio.com/items?itemName=redhat.openshift-vsts#review-details) or as feature requests on [GitHub](https://github.com/redhat-developer/openshift-vsts/issues).
