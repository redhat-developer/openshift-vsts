'use strict';

import task = require('vsts-task-lib/task');

import * as install from './oc-install';

let version = task.getInput('version');
let endpoint = task.getInput('k8sService');
let kubeConfig = task.getEndpointAuthorizationParameter(
  endpoint,
  'kubeconfig',
  true
);
let agentOS = task.osType();
install
  .installOc(version, agentOS)
  .then(function(ocPath: string | null) {
    if (ocPath === null) {
      throw 'No oc binary installed';
    }
    return install.addOcToPath(ocPath, agentOS);
  })
  .then(function() {
    return install.writeKubeConfig(kubeConfig, agentOS);
  })
  .then(function() {
    task.setResult(
      task.TaskResult.Succeeded,
      'oc successfully installed and configured.'
    );
  })
  .catch(function(err) {
    task.setResult(task.TaskResult.Failed, err);
    return;
  });
