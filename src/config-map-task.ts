'use strict';

import task = require('vsts-task-lib/task');

import * as oc from './oc-run';
import * as install from './oc-install';
import { ConfigMap } from './config-map';

async function run() {
  let version = task.getInput('version');
  let agentOS = task.osType();
  let ocPath = await install.installOc(version, agentOS);
  if (ocPath === null) {
    throw new Error('no oc binary found');
  }

  let configMapName = task.getInput('configMapName');
  let namespace = task.getInput('namespace');
  let properties = task.getInput('properties');
  let configMap = new ConfigMap(configMapName, properties);

  await install.writeKubeConfig(getKubeConfig(), agentOS);
  await oc.execOc(ocPath, configMap.patchCmd(namespace));

  task.setResult(
    task.TaskResult.Succeeded,
    'oc command successfully executed.'
  );
}

function getKubeConfig(): string {
  let endpoint = task.getInput('k8sService');
  return task.getEndpointAuthorizationParameter(endpoint, 'kubeconfig', true);
}

run()
  .then(function() {
    task.setResult(
      task.TaskResult.Succeeded,
      'ConfigMap successfully updated.'
    );
  })
  .catch(function(err: Error) {
    console.log('foo');
    task.setResult(task.TaskResult.Failed, err.message);
  });
