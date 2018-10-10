"use strict"

import tl = require('vsts-task-lib/task');
import oc = require('./oc-cmd')
import install = require('./oc-install')

let version = tl.getInput('version');
let endpoint = tl.getInput('k8sService');
let kubeconfig = tl.getEndpointAuthorizationParameter(endpoint, 'kubeconfig', true);
let argLine = tl.getInput('cmd');

install.installOc(version)
    .then(function (ocPath: string | null) {
        if (ocPath === null) {
            throw "No oc binary found"
        }
        return oc.execOc(kubeconfig, ocPath, argLine)
    })
    .then(function () {
        tl.setResult(tl.TaskResult.Succeeded, "oc command successfully executed.");
    })
    .catch(function (err) {
        tl.setResult(tl.TaskResult.Failed, err);
        return;
    })
    ;
