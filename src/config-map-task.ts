'use strict';

import task = require('vsts-task-lib/task');

import * as oc from './oc-run';
import * as install from './oc-install';
import { ConfigMap } from './config-map';

async function run() {
  if (task.osType() !== 'Linux') {
    throw new Error('task needs to run on a Linux agent');
  }

  let version = task.getInput('version');
  let ocPath = await install.installOc(version);

  if (ocPath === null) {
    throw new Error('no oc binary found');
  }

  let configMapName = task.getInput('configMapName');
  let namespace = task.getInput('namespace');
  let properties = task.getInput('properties');
  let configMap = new ConfigMap(configMapName, properties);

  await oc.execOc(getKubeConfig(), ocPath, configMap.patchCmd(namespace));

  task.setResult(
    task.TaskResult.Succeeded,
    'oc command successfully executed.'
  );
}

function getKubeConfig(): string {
  let endpoint = task.getInput('k8sService');
  let kubeConfig = task.getEndpointAuthorizationParameter(
    endpoint,
    'kubeconfig',
    true
  );
  return kubeConfig;
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
