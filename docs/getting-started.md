# Getting started

<!-- TOC depthFrom:2 -->

- [Configuring Kubernetes service connection](#configuring-kubernetes-service-connection)
- [Executing user-defined oc commands](#executing-user-defined-oc-commands)

<!-- /TOC -->

The OpenShift extension for Azure DevOps allows you to connect and interact with an [OpenShift](https://www.okd.io/) cluster, executing user-defined [oc](https://docs.okd.io/3.11/cli_reference/index.html) commands as part of your build or release pipeline.

The following paragraphs guide you through the process of using this extension.

## Configuring Kubernetes service connection

To execute OpensShift commands as part of your build or deployment, you first need a way to connect to your cluster.
In Azure DevOps, access to external and remote services are configured in [service connections](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=vsts).
Azure DevOps comes with a built-in connection for Kubernetes, the so-called [Kubernetes service connection](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=vsts#sep-kuber).
Since Kubernetes and OpenShift use the same authentication mechanism, we can leverage this existing service connection for our purposes.
The image below shows where you can find it.

 ![Kubernetes Service Connection](../images/kubernetes_service_connection.png)

First select projects settings (cogwheel icon).
From there choose _Service connections_, followed by _New service connection_.
In the appearing dialogue you need to enter the following information:

<dl>
  <dt>Connection Name</dt>
  <dd>Required. The name you will use to refer to this service connection in task properties of the OpenShift execute task.</dd>
  <dt>Server URL</dt>
  <dd>Required. The URL of the Kubernetes/Openshift cluster.</dd>
  <dt>Kubeconfig</dt>
  <dd>The contents of the kubectl configuration file.</dd>  
</dl>

## Executing user-defined oc commands

Once you have a Kubernetes service connection defined, you can start using the _Execute OpenShift command_ task offered by this extension.

![Adding Execute OpenShift command](../images/adding_oc_cmd_task.png)

In the edit pipeline view, select the _+_ to add a task to your pipeline.
You can filter the appearing task list by searching for _Execute OpenShift_.
Add the _Execute OpenShift command_ task to your pipeline using the _Add_ button.

The _Execute OpenShift command_ has four configuration options.

![Configuration of OpenShift command](../images/cmd_exec_config.png)

<dl>
  <dt>Display name</dt>
  <dd>The name displayed in the task list, eg "Rollout latest".</dd>
  <dt>OpenShift/Kubernetes service connection</dt>
  <dd>Required. The service connection to use to execute this command. See <a href="#configuring-kubernetes-service-connection">Configuring Kubernetes service connection</a>.</dd>
  <dt>Version of oc to use</dt>
  <dd>Allows to specify the version of oc to use for command execution, eg v3.10.0. If left blank the latest stable version is used.</dd>  
  <dt>Command to run</dt>
  <dd>The actual oc command to run starting with the oc sub-command, eg "rollout latest dc/my-app -n production".</dd>
</dl>

<img align="left" width="32" height="32" src="../images/lightbulb.png">
It is possible to use variables defined in the agent.
For example, to reference a file in the artefact _my_sources you could do:

```bash
apply -f ${SYSTEM_DEFAULTWORKINGDIRECTORY/_my_sources/my-openshift-config.yaml`
```
