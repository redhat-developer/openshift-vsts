'use strict';

import oc = require('./oc-exec');
import task = require('vsts-task-lib/task');
import tl = require('vsts-task-lib/task');
import path = require('path');

const OPENSHIFT_SERVICE_NAME = 'openshiftService';
const BASIC_AUTHENTICATION = 'UsernamePassword';
const TOKEN_AUTHENTICATION = 'Token';
const NO_AUTHENTICATION = 'None';

export interface OpenShiftEndpoint {
  /** URL to the OpenShiftServer */
  serverUrl: string;

  /** dictionary of auth data */
  parameters: {
    [key: string]: string;
  };

  /** auth scheme such as OAuth or username/password etc... */
  scheme: string;
}

/**
 * @return the OpenShift endpoint authorization as referenced by the task property 'openshiftService'.
 */
export function getOpenShiftEndpoint(): OpenShiftEndpoint {
  let clusterConnection = task.getInput(OPENSHIFT_SERVICE_NAME);

  let auth = task.getEndpointAuthorization(clusterConnection, false);
  let serverUrl = task.getEndpointUrl(clusterConnection, false);

  return {
    serverUrl: serverUrl,
    parameters: auth.parameters,
    scheme: auth.scheme
  };
}

/**
 * Creates the kubeconfig based on the endpoint authorization retrieved
 * from the OpenShift service connection.
 *
 * @param endpoint The OpenShift endpoint.
 * @param ocPath fully qualified path to the oc binary.
 * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
 */
export async function createKubeConfig(
  endpoint: OpenShiftEndpoint,
  ocPath: string,
  osType: string
) {
  if (endpoint === null) {
    throw new Error('null endpoint is not allowed');
  }

  // potential values for EndpointAuthorization:
  //
  // parameters:{"apitoken":***}, scheme:'Token'
  // parameters:{"username":***,"password":***}, scheme:'UsernamePassword'
  // parameters:{"kubeconfig":***}, scheme:'None'
  let authType = endpoint.scheme;
  let skip = skipTlsVerify(endpoint);
  switch (authType) {
    case BASIC_AUTHENTICATION:
      let username = endpoint.parameters['username'];
      let password = endpoint.parameters['password'];
      await oc.execOc(
        ocPath,
        `login ${skip} -u ${username} -p ${password} ${endpoint.serverUrl}`
      );
      break;
    case TOKEN_AUTHENTICATION:
      let args =
        `login ${skip} --token ${endpoint.parameters['apitoken']} ` +
        endpoint.serverUrl;
      await oc.execOc(ocPath, args);
      break;
    case NO_AUTHENTICATION:
      authKubeConfig(endpoint.parameters['kubeconfig'], osType);
      break;
    default:
      throw new Error(`unknown authentication type '${authType}'`);
  }

  exportKubeConfig(osType);
}

/**
 * Determines whether certificate verification should be skipped.
 *
 * @param endpoint the OpenShift endpoint.
 * @return oc option for skipping certificate verification.
 */
export function skipTlsVerify(endpoint: OpenShiftEndpoint): string {
  let skipTlsVerify = '';
  if (endpoint.parameters['acceptUntrustedCerts'] === 'true') {
    skipTlsVerify = '--insecure-skip-tls-verify ';
  }
  return skipTlsVerify;
}

/**
 * Writes the cluster auth config to disk and sets the KUBECONFIG env variable
 *
 * @param config The cluster auth config to write to disk
 * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
 */
export function authKubeConfig(config: string, osType: string) {
  if (config === null || config === '') {
    throw new Error('empty or null kubeconfig is not allowed');
  }

  let kubeConfigDir = path.join(userHome(osType), '.kube');
  if (!tl.exist(kubeConfigDir)) {
    tl.mkdirP(kubeConfigDir);
  }

  let kubeConfig = path.join(kubeConfigDir, 'config');
  tl.writeFile(kubeConfig, config);
  tl.setVariable('KUBECONFIG', kubeConfig);
}

/**
 * Exports the KUBECONFIG environment variable.
 *
 * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
 */
export function exportKubeConfig(osType: string) {
  let kubeConfig = path.join(userHome(osType), '.kube', 'config');
  tl.setVariable('KUBECONFIG', kubeConfig);
}

/**
 * Determines the default home directory of the user based on OS type
 *
 * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
 * @return the fully qualified path to the users home directory
 * @throws Error in case the environment variable to determine the users home
 * directory is not set.
 */
export function userHome(osType: string): string {
  let workingDir;

  switch (osType) {
    case 'Windows_NT':
      workingDir = process.env['USERPROFILE'];
      break;
    case 'Linux':
    case 'Darwin':
      workingDir = process.env['HOME'];
      break;
    default:
      throw new Error('Unable to determine home directory');
  }

  if (workingDir === undefined) {
    throw new Error('Unable to determine home directory');
  }

  return workingDir;
}
