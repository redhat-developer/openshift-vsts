import ma = require('vsts-task-lib/mock-answer');
import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', '..', 'lib', 'task.js');
let tr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = '/tmp';
process.env['ENDPOINT_AUTH_PARAMETER_K8SENDPOINT_KUBECONFIG'] =
  'dummy kube config';
process.env['AGENT_OS'] = 'Linux';

tr.setInput('k8sService', 'k8sendpoint');
tr.setInput('version', 'v3.9.0');
tr.setInput('cmd', 'get nodes');

let a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
  exec: {
    'mkdir -p /tmp/.download': {
      code: 0,
      stdout: ''
    },
    'curl -L -o /tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit.tar.gz https://github.com/openshift/origin/releases/download/v3.9.0/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit.tar.gz': {
      code: 0,
      stdout: ''
    },
    'tar -xvf /tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit.tar.gz -C /tmp/.download': {
      code: 0,
      stdout: ''
    },
    'mkdir -p /tmp/.kube': {
      code: 0,
      stdout: ''
    },
    '/tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit/oc get nodes': {
      code: 0,
      stdout: ''
    }
  },
  exist: {
    '/tmp/.download': true,
    '/tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit': false,
    '/tmp/.download/openshift-origin-client-tools-v3.9.0-191fece-linux-64bit/oc': true,
    '/tmp/.kube': false
  }
};
tr.setAnswers(a);

tr.run();
