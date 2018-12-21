# Getting started

The OpenShift extension for Azure DevOps allows you to connect and interact with an [OpenShift](https://www.okd.io/) cluster as part of your build or release pipeline.
The following paragraphs guide you through the process of using this extension.

<!-- MarkdownTOC autolink="true" autoanchor="true" -->

- [Configuring the OpenShift service connection](#configuring-the-openshift-service-connection)
  - [Basic Authentication](#basic-authentication)
  - [Token Authentication](#token-authentication)
  - [Kubeconfig](#kubeconfig)
- [Pipeline Tasks](#pipeline-tasks)
  - [Install and setup oc](#install-and-setup-oc)
  - [Executing single oc commands](#executing-single-oc-commands)
  - [Updating a ConfigMap](#updating-a-configmap)
- [YAML configuration](#yaml-configuration)

<!-- /MarkdownTOC -->

<a id="configuring-the-openshift-service-connection"></a>
## Configuring the OpenShift service connection

To use any of the pipeline tasks, you first need a way to connect to your cluster.
In Azure DevOps, access to external and remote services is configured in [service connections](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=vsts).
The OpenShift extension for Azure DevOps provides a custom OpenShift service connection type which allows you to connect to your cluster using various authentication forms.

To configure an OpenShift connection, select the project settings (cogwheel icon).
From there choose _Service connections_, followed by _New service connection_.
Select the OpenShift service connection and use one of the following methods to cofigure authentication:

<a id="basic-authentication"></a>
### Basic Authentication

![Basic Authentication](../images/basic_authentication.png)

<dl>
  <dt>Connection Name</dt>
  <dd>Required. The name you will use to refer to this service connection.</dd>
  <dt>Server URL</dt>
  <dd>Required. The URL of the Openshift cluster.</dd>
  <dt>Username</dt>
  <dd>Required. OpenShift username.</dd>
  <dt>Password</dt>
  <dd>Required. Password for the specified user.</dd>    
  <dt>Accept untrusted SSL certificates</dt>
  <dd>Whether it is ok to accept self-signed (untrusted) certificated.</dd>  
</dl>


<a id="token-authentication"></a>
### Token Authentication

![Token Authentication](../images/token_authentication.png)

<dl>
  <dt>Connection Name</dt>
  <dd>Required. The name you will use to refer to this service connection.</dd>
  <dt>Server URL</dt>
  <dd>Required. The URL of the Openshift cluster.</dd>
  <dt>Accept untrusted SSL certificates</dt>
  <dd>Whether it is ok to accept self-signed (untrusted) certificated.</dd>  
  <dt>API Token</dt>
  <dd>Required.The API token used for authentication.</dd>  
</dl>

<a id="kubeconfig"></a>
### Kubeconfig

![Kubeconfig Authentication](../images/kubeconfig_authentication.png)

<dl>
  <dt>Connection Name</dt>
  <dd>Required. The name you will use to refer to this service connection.</dd>
  <dt>Server URL</dt>
  <dd>Required. The URL of the Openshift cluster.</dd>
  <dt>Kubeconfig</dt>
  <dd>The contents of the kubectl configuration file.</dd>  
</dl>

---

_**Note:** In version 1.\* of this extension the Azure DevOps built-in [Kubernetes service connection](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/service-endpoints?view=vsts#sep-kuber) was used.
If you want to you keep using this service connection you need to select the 1.* version when configuring a task._

---

<a id="pipeline-tasks"></a>
## Pipeline Tasks 

The following paragraphs describe each of the provided pipeline tasks and their use. 

<a id="install-and-setup-oc"></a>
### Install and setup oc

The most generic task is the _Install and setup oc_ task.
This task allows you to install a specific version of the OpenShift CLI (`oc`).
The installed binary matches the OS of your agent.
The task also adds `oc` to the `PATH` and creates a kubeconfig file for authentication against the OpenShift cluster.

After adding and configuring a _Install and setup oc_ task in your pipeline, you can use `oc` directly within your _Command Line_ task, for example:

![oc within Command Line task](../images/oc_with_command_line_task.png)

To add the _Install and setup oc_ task to your pipeline, select the _+_ next to the agent job.
You can filter the appearing task list by searching for _Install oc_.
Add the _Install and setup oc_ task to your pipeline using the _Add_ button.

![Adding Install oc task](../images/adding_install_oc_task.png)

Once added, you need to edit the following configuration options:

![Configuration of Install oc task](../images/configure_install_oc_task.png)

<dl>
  <dt>Display name</dt>
  <dd>The name displayed in the task list, eg "Install oc".</dd>
  <dt>OpenShift service connection</dt>
  <dd>Required. The service connection to use to execute this command. See <a href="#configuring-the-openshift-service-connection">Configuring the OpenShift service connection</a>.</dd>
  <dt>Version of oc to use</dt>
  <dd>Allows to specify the version of oc to use, eg v3.10.0. If left blank the latest stable version is used. You can also specify a direct URL to a oc release bundle.</dd>  
</dl>

---

<a id="executing-single-oc-commands"></a>
### Executing single oc commands

In case you want to execute a single `oc` command you can use the _Execute OpenShift command_ task.

To add this task, select the _+_ to add a task to your pipeline.
You can filter the appearing task list by searching for _Execute oc command_.
Add the _Execute oc command_ task to your pipeline using the _Add_ button.

![Adding Execute oc task](../images/adding_oc_cmd_task.png)


The _Execute oc command_ has four configuration options.

![Configuration of Execute oc task](../images/cmd_exec_config.png)

<dl>
  <dt>Display name</dt>
  <dd>The name displayed in the task list, eg "Rollout".</dd>
  <dt>OpenShift service connection</dt>
  <dd>Required. The service connection to use to execute this command. See <a href="#configuring-the-openshift-service-connection">Configuring the OpenShift service connection</a>.</dd>
  <dt>Version of oc to use</dt>
  <dd>Allows to specify the version of oc to use for command execution, eg v3.10.0. If left blank the latest stable version is used. You can also specify a direct URL to the oc release bundle.</dd>  
  <dt>Command to run</dt>
  <dd>The actual oc command to run starting with the oc sub-command, eg "rollout latest dc/my-app -n production".</dd>
</dl>

---

_**Note:** It is possible to use variables defined in the agent.
For example, to reference a file in the artefact \_my\_sources you could do:_

```bash
apply -f ${SYSTEM_DEFAULTWORKINGDIRECTORY}/_my_sources/my-openshift-config.yaml
```

---

---

_**Note:** In case you are reaching the GitHub API rate limit, you can set GITHUB_ACCESS_TOKEN as a pipeline variable.
To create a GitHub access token refer to [Creating a personal access token for the command line](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line)._

---

<a id="updating-a-configmap"></a>
### Updating a ConfigMap

An even more specific task offered by this extension is the _Update ConfigMap_ task.
It allows you to update the properties of a given ConfigMap using a grid.

To add this task, select the _+_ to add a task to your pipeline.
You can filter the appearing task list by searching for _Update ConfigMap_.
Add the _Update ConfigMap_ task to your pipeline using the _Add_ button.

![Adding Update ConfigMap task](../images/adding_config_map_task.png)

The _Update ConfigMap_ task has six configuration options.

![Configuration of Update ConfigMap task](../images/configure_config_map_task.png)

<dl>
  <dt>Display name</dt>
  <dd>The name displayed in the task list, eg "Rollout latest".</dd>
  <dt>OpenShift/Kubernetes service connection</dt>
  <dd>Required. The service connection to use to execute this command. See <a href="#configuring-the-openshift-service-connection">Configuring the OpenShift service connection</a>.</dd>
  <dt>Version of oc to use</dt>
  <dd>Allows to specify the version of oc to use for command execution, eg v3.10.0. If left blank the latest stable version is used. You can also specify a direct URL to the oc release bundle.</dd>  
  <dt>Name of ConfigMap</dt>
  <dd>Required.The name of the ConfigMap to update.</dd>
  <dt>Namespace of ConfigMap</dt>
  <dd>The namespace in which to find the ConfigMap. The current namespace is used if none is specified.</dd>
  <dt>ConfigMap Properties</dt>
  <dd>The properties to set/update. Only the properties which need creating/updating need to be listed. Space separated values need to be surrounded by quotes ("). </dd>  
</dl>

---

_**Note:** It is possible to use variables defined in the agent.
For example, to reference a variable MY_VAR defined in the pipeline configuration, you can use ${MY_VAR} as the property value._

<a id="yaml-configuration"></a>
## YAML configuration

You can also use the tasks of the OpenShift extension as part of a YAML defined pipeline.
The following configuration shows an example for each of the provided tasks:


```yaml
jobs:
- job: myjob
  displayName: MyJob
  pool:
    vmImage: 'vs2017-win2016'
  steps:
  # Install oc so that it can be used within a 'script' or bash 'task'
  - task: oc-setup@2
    displayName: Setup oc
    inputs:
      openshiftService: 'my_openshift_connection'
  # A script task making use of 'oc'    
  - script: |
      oc new-project my-project
      oc apply -f ${SYSTEM_DEFAULTWORKINGDIRECTORY}/openshift/config.yaml -n my-project
    displayName: 
  # Single shot 'oc' command
  - task: oc-cmd@2
    displayName: Wait for deployment
    inputs:
      openshiftService: 'my_openshift_connection'
      cmd: 'rollout status -w deployment/my-app'
  # Updating an existing ConfigMap
  - task: config-map@2
    displayName: Update ConfigMap
    inputs:
      openshiftService: 'my_openshift_connection'
      configMapName: 'my-config'
      namespace: 'my-project'
      properties: '-my-key1 my-value1 -my-key2 my-value2'
```

_**Note:** With Azure DevOps YAML defined pipelines are currently only available for build pipelines.
Configuration as code for release pipelines is under development.
See [here](https://stackoverflow.com/questions/52323065/azure-devops-yaml-release-pipelines) and [here](https://dev.azure.com/mseng/Azure%20DevOps%20Roadmap/_workitems/edit/1221170)._



