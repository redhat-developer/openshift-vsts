"use strict"

import tl = require('vsts-task-lib/task');
import oc = require('./oc-cmd')

let endpoint = tl.getInput('k8sService');
let kubeconfig = tl.getEndpointAuthorizationParameter(endpoint, 'kubeconfig', true);
let argLine = tl.getInput('cmd');

oc.execOc(kubeconfig, argLine)
    .then(function () {
        tl.setResult(tl.TaskResult.Succeeded, "oc command successfully executed.");
    })
    .catch(function (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    });
