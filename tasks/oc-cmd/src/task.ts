'use strict';

import task = require('vsts-task-lib/task');
import oc = require('./oc-cmd');
import install = require('./oc-install');

if (task.osType() === 'Linux') {
  let version = task.getInput('version');
  let endpoint = task.getInput('k8sService');
  let kubeconfig = task.getEndpointAuthorizationParameter(
    endpoint,
    'kubeconfig',
    true
  );
  let argLine = task.getInput('cmd');
  install
    .installOc(version)
    .then(function(ocPath: string | null) {
      if (ocPath === null) {
        throw 'No oc binary found';
      }
      return oc.execOc(kubeconfig, ocPath, argLine);
    })
    .then(function() {
      task.setResult(
        task.TaskResult.Succeeded,
        'oc command successfully executed.'
      );
    })
    .catch(function(err) {
      task.setResult(task.TaskResult.Failed, err);
      return;
    });
} else {
  task.setResult(
    task.TaskResult.Failed,
    'Task needs to run on an Linux agent.'
  );
}
