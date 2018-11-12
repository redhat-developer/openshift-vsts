'use strict';

import task = require('vsts-task-lib/task');
import oc = require('./oc-run');

import * as install from './oc-install';

let version = task.getInput('version');
let endpoint = task.getInput('k8sService');
let kubeConfig = task.getEndpointAuthorizationParameter(
  endpoint,
  'kubeconfig',
  true
);
let argLine = task.getInput('cmd');
let agentOS = task.osType();
install
  .installOc(version, agentOS)
  .then(function(ocPath: string | null) {
    if (ocPath === null) {
      throw 'No oc binary found';
    }
    return oc.execOc(kubeConfig, ocPath, argLine);
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
