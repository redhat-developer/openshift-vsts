/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { RunnerHandler } from './oc-exec';
import {
  BASIC_AUTHENTICATION,
  NO_AUTHENTICATION,
  TOKEN_AUTHENTICATION,
  RUNTIME_CONFIGURATION_OPTION,
} from './constants';

import task = require('azure-pipelines-task-lib/task');
import tl = require('azure-pipelines-task-lib/task');
import path = require('path');

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
  const clusterConnection = task.getInput('openshiftService');

  const auth = task.getEndpointAuthorization(clusterConnection, false);
  const serverUrl = task.getEndpointUrl(clusterConnection, false);

  return {
    serverUrl,
    parameters: auth.parameters,
    scheme: auth.scheme
  };
}

/**
 * Determines whether certificate authority file should be used.
 *
 * @param endpoint the OpenShift endpoint.
 * @return oc option for using a certificate authority file.
 */
export function getCertificateAuthorityFile(
  endpoint: OpenShiftEndpoint
): string {
  let certificateFile = '';
  if (endpoint.parameters.certificateAuthorityFile) {
    certificateFile = `--certificate-authority="${
      endpoint.parameters.certificateAuthorityFile
    }"`;
  }
  return certificateFile;
}

/**
 * Determines whether certificate verification should be skipped.
 *
 * @param endpoint the OpenShift endpoint.
 * @return oc option for skipping certificate verification.
 */
export function skipTlsVerify(endpoint: OpenShiftEndpoint): string {
  let cmdSkipTlsVerify = '';
  if (endpoint.parameters.acceptUntrustedCerts === 'true') {
    cmdSkipTlsVerify = '--insecure-skip-tls-verify ';
  }
  return cmdSkipTlsVerify;
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
      workingDir = process.env.USERPROFILE;
      break;
    case 'Linux':
    case 'Darwin':
      workingDir = process.env.HOME;
      break;
    default:
      throw new Error('Unable to determine home directory');
  }

  if (workingDir === undefined) {
    throw new Error('Unable to determine home directory');
  }

  return workingDir;
}

/**
 * Writes the cluster auth config to disk and sets the KUBECONFIG env variable
 *
 * @param config The cluster auth config to write to disk
 * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
 */
export function writeKubeConfigToFile(inlineConfig: string, osType: string): void {
  if (!inlineConfig) {
    throw new Error('Empty kubeconfig is not allowed');
  }

  const kubeConfigDir = path.join(userHome(osType), '.kube');
  if (!tl.exist(kubeConfigDir)) {
    tl.mkdirP(kubeConfigDir);
  }

  const kubeConfig = path.join(kubeConfigDir, 'config');
  tl.writeFile(kubeConfig, inlineConfig);
}

/**
 * Exports the KUBECONFIG environment variable.
 *
 * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
 */
export function exportKubeConfig(osType: string): void {
  const kubeConfig = path.join(userHome(osType), '.kube', 'config');
  tl.setVariable('KUBECONFIG', kubeConfig);
}

/**
 * Creates the kubeconfig based on the endpoint authorization retrieved
 * from the OpenShift service connection.
 *
 * @param ocPath fully qualified path to the oc binary.
 * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
 */
export async function createKubeConfigFromServiceConnection(ocPath: string, osType: string): Promise<void> {
  const endpoint = getOpenShiftEndpoint();

  // potential values for EndpointAuthorization:
  //
  // parameters:{"apitoken":***}, scheme:'Token'
  // parameters:{"username":***,"password":***}, scheme:'UsernamePassword'
  // parameters:{"kubeconfig":***}, scheme:'None'
  const authType = endpoint.scheme;
  let useCertificateOrSkipTls = getCertificateAuthorityFile(endpoint);
  if (useCertificateOrSkipTls === '') {
    useCertificateOrSkipTls = skipTlsVerify(endpoint);
  }
  switch (authType) {
    case BASIC_AUTHENTICATION: {
      await RunnerHandler.execOc(
        ocPath,
        `login ${useCertificateOrSkipTls} -u ${endpoint.parameters.username} -p ${endpoint.parameters.password} ${endpoint.serverUrl}`
      );
      break;
    }
    case TOKEN_AUTHENTICATION: {
      await RunnerHandler.execOc(
        ocPath,
        `login ${useCertificateOrSkipTls} --token ${endpoint.parameters.apitoken} ${endpoint.serverUrl}`
      );
      break;
    }
    case NO_AUTHENTICATION: {
      writeKubeConfigToFile(endpoint.parameters.kubeconfig, osType);
      break;
    }
    default:
      throw new Error(`unknown authentication type '${authType}'`);
  }
}

/**
 * Verifies existence of the config file and sets KUBECONFIG environment variable.
 *
 * @param configPath The OpenShift endpoint.
 */
export function exportKubeConfigToPath(configPath): void {
  try {
    if (fs.statSync(configPath).isFile()) {
      tl.setVariable('KUBECONFIG', configPath);
    } else {
      throw new Error(`Provided path ${configPath} is not a valid kubeconfig file.`);
    }
  } catch (ex) {
    throw new Error(`Provided kubeconfig path does not exist: ${configPath}`);
  }
}

export function setConfigurationRuntime(osType: string): void {
  const configurationType = tl.getInput("configurationType");
  if (configurationType === 'inline') {
    const inlineConfig = task.getInput('inlineConfig', false);
    writeKubeConfigToFile(inlineConfig, osType);
    exportKubeConfig(osType);
  } else {
    const configPath = task.getPathInput('configurationPath', false);
    exportKubeConfigToPath(configPath);
  }
}

/**
 * Creates the kubeconfig based on the connectionType selected by the user
 *
 * @param ocPath fully qualified path to the oc binary.
 * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
 */
export async function createKubeConfig(ocPath: string, osType: string): Promise<void> {
  const connectionType: string = task.getInput('connectionType');

  if (connectionType === RUNTIME_CONFIGURATION_OPTION) {
    setConfigurationRuntime(osType);
  } else {
    await createKubeConfigFromServiceConnection(ocPath, osType);
    exportKubeConfig(osType);
  }
}
