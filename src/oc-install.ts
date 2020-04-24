/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { ToolRunner, IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner';
import * as toolLib from 'azure-pipelines-tool-lib/tool';
import * as semver from 'semver';
import { RunnerHandler } from './oc-exec';
import { LINUXV3, MACOSXV3, WINV3, LINUXV4, MACOSXV4, WINV4, OC_TAR_GZ, OC_ZIP, LATEST, ZIP, TAR_GZ } from './constants';
import { unzipArchive } from './utils/zip_helper';
import { BinaryVersion, FindBinaryStatus } from './utils/exec_helper';

import tl = require('azure-pipelines-task-lib/task');
import path = require('path');
import fetch = require('node-fetch');

export class InstallHandler {
  /**
   * Downloads the requested oc CLI and returns the full path to the executable.
   *
   * @param versionToUse the version of `oc` to install.
   * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'. See https://nodejs.org/api/os.html#os_os_type
   * @param useLocalOc to use the current oc cli already installed in machine
   * @param proxy proxy to use to download oc
   * @return the full path to the installed executable or null if the install failed.
   */
  static async installOc(versionToUse: BinaryVersion, osType: string, useLocalOc: boolean, proxy: string): Promise<FindBinaryStatus> {
    if (useLocalOc) {
      const localOcBinary: FindBinaryStatus = InstallHandler.getLocalOcBinary(versionToUse);
      if (localOcBinary.found) {
        return localOcBinary;
      }
    }

    if (!versionToUse.valid) {
      versionToUse = InstallHandler.latestStable(osType);
      if (versionToUse.valid === false) {
        return { found: false, reason: versionToUse.reason };
      }
    }

    // check if oc version requested exists in cache
    let versionToCache: string;
    if (versionToUse.type === 'number') {
      versionToCache = InstallHandler.versionToCache(versionToUse.value);
      const toolCached: FindBinaryStatus = InstallHandler.versionInCache(versionToCache, osType);
      if (toolCached.found) {
        return toolCached;
      }
    }

    tl.debug('creating download directory');
    const downloadDir = `${process.env.SYSTEM_DEFAULTWORKINGDIRECTORY}/.download`;
    if (!fs.existsSync(downloadDir)) {
      tl.mkdirP(downloadDir);
    }

    const url: string = await InstallHandler.getOcURLToDownload(versionToUse, osType);
    if (!url) {
      return { found: false, reason: 'Unable to determine URL where to download oc executable.' };
    }

    tl.debug(`downloading: ${url}`);
    const ocBinary: FindBinaryStatus = await InstallHandler.downloadAndExtract(url, downloadDir, osType, versionToCache, proxy);
    if (ocBinary.found === false) {
      return { found: false, reason: ocBinary.reason};
    }

    return ocBinary;
  }

  /**
   * Determines the latest stable version of the OpenShift CLI on mirror.openshift.
   *
   * @return the version of the latest OpenShift CLI on mirror.openshift.
   */
  static latestStable(osType: string): BinaryVersion {
    tl.debug('determining latest oc version');

    const bundle = InstallHandler.getOcBundleByOSAndVersion(osType, 4);
    if (!bundle) {
      return { valid: false, reason: 'Unable to find Oc bundle url. OS Agent is not supported at this moment.' };
    }
    const ocUtils = InstallHandler.getOcUtils();
    const url = `${ocUtils.openshiftV4BaseUrl}/${LATEST}/${bundle}`;
    tl.debug(`latest stable oc version: ${url}`);

    return { valid: true, type: 'url', value: url };
  }

  /**
   * Returns the download URL for the oc CLI for a given version v(major).(minor).(patch) (e.g v3.11.0).
   * The binary type is determined by the agent's operating system.
   *
   * @param {string} version Oc version.
   * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
   * @returns {Promise} Promise string representing the URL to the tarball. undefined is returned
   * if no matching URL can be determined for the given tag.
   */
  static ocBundleURL(version: string, osType: string, latest?: boolean): string {
    tl.debug(`determining tarball URL for version ${version}`);

    if (!version) {
      return undefined;
    }

    // remove char v if present to ensure old pipelines keep working when the extension will be updated
    if (version.startsWith('v')) {
      version = version.substr(1);
    }

    let url = '';
    // determine the base_url based on version
    let reg = new RegExp('\\d+(?=\\.)');
    const vMajorRegEx: RegExpExecArray = reg.exec(version);
    if (!vMajorRegEx || vMajorRegEx.length === 0) {
      tl.debug('Error retrieving version major');
      return undefined;
    }
    const vMajor: number = +vMajorRegEx[0];
    const ocUtils = InstallHandler.getOcUtils();

    // if we need the latest correct release of this oc version we need to retrieve the (major).(minor) of the version
    if (latest) {
      reg = new RegExp('\\d+\\.\\d+(?=\\.)*');
      const versionRegEx: RegExpExecArray = reg.exec(version);
      if (!versionRegEx || versionRegEx.length === 0) {
        tl.debug(
          'Error retrieving version release - unable to find latest version'
        );
        return undefined;
      }
      const baseVersion: string = versionRegEx[0]; // e.g 3.11
      if (!ocUtils[`oc${baseVersion}`]) {
        tl.debug(`Error retrieving latest patch for oc version ${baseVersion}`);
        return undefined;
      }
      version = ocUtils[`oc${baseVersion}`];
    }

    if (vMajor === 3) {
      url = `${ocUtils.openshiftV3BaseUrl}/${version}/`;
    } else if (vMajor === 4) {
      url = `${ocUtils.openshiftV4BaseUrl}/${version}/`;
    } else {
      tl.debug('Invalid version');
      return undefined;
    }

    version = version.includes('stable') ? undefined : version;
    const bundle = InstallHandler.getOcBundleByOSAndVersion(osType, vMajor, version);
    if (!bundle) {
      tl.debug('Unable to find bundle url');
      return undefined;
    }

    url += bundle;

    tl.debug(`archive URL: ${url}`);
    return url;
  }

  static getOcBundleByOSAndVersion(osType: string, vMajor: number, version?: string): string {
    version = !version ? '' : `-${version}`;
    // determine the bundle path based on the OS type
    switch (`${osType}V${vMajor.toString()}`) {
      case 'LinuxV4': {
        return `${LINUXV4}${version}.${TAR_GZ}`;
      }
      case 'LinuxV3': {
        return `${LINUXV3}/${OC_TAR_GZ}`;
      }
      case 'DarwinV4': {
        return `${MACOSXV4}${version}.${TAR_GZ}`;
      }
      case 'DarwinV3': {
        return `${MACOSXV3}/${OC_TAR_GZ}`;
      }
      case 'Windows_NTV4': {
        return `${WINV4}${version}.${ZIP}`;
      }
      case 'Windows_NTV3': {
        return `${WINV3}/${OC_ZIP}`;
      }
      default: {
        return undefined;
      }
    }
  }

  /**
   * Downloads and extract the oc release archive.
   *
   * @param url the oc release download URL.
   * @param downloadDir the directory into which to extract the archive.
   * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
   * @param version version of oc cli to download
   * @param proxy proxy to use to download oc
   * It is the responsibility of the caller to ensure that the directory exist.
   */
  static async downloadAndExtract(url: string, downloadDir: string, osType: string, versionToCache: string, proxy: string): Promise<FindBinaryStatus> {
    if (!url) {
      return { found: false, reason: 'URL where to download oc is not valid.' };
    }

    downloadDir = path.normalize(downloadDir);
    if (!tl.exist(downloadDir)) {
      return { found: false, reason: `Unable to extract Oc executable from archive. Directory ${downloadDir} does not exist.` };
    }

    const parts = url.split('/');
    const archive = parts[parts.length - 1];
    const archivePath = path.join(downloadDir, archive);

    if (!tl.exist(archivePath)) {
      const curl: ToolRunner = tl.tool('curl');
      curl
        .arg('-s')
        .argIf(!!proxy, ['-x', proxy])
        .arg('-L')
        .arg('-o')
        .arg(archivePath)
        .arg(url);
      await curl.exec();
    }

    let archiveType = path.extname(archive);
    let expandDir = archive.replace(archiveType, '');
    // handle tar.gz explicitly
    if (path.extname(expandDir) === '.tar') {
      archiveType = '.tar.gz';
      expandDir = expandDir.replace('.tar', '');
    }

    tl.debug(`expanding ${archivePath} into ${downloadDir}`);

    await unzipArchive(archiveType, archivePath, downloadDir);

    let ocBinary = InstallHandler.ocBinaryByOS(osType);

    ocBinary = path.join(downloadDir, ocBinary);
    if (!tl.exist(ocBinary)) {
      return { found: false, reason: `Oc binary path ${ocBinary} doesn't exist.` };
    }

    fs.chmodSync(ocBinary, '0755');
    if (versionToCache) await toolLib.cacheFile(ocBinary, 'oc', 'oc', versionToCache);
    return { found: true, path: ocBinary };
  }

  /**
   * Returns the url to download oc binary
   *
   * @param version the version to download
   * @param osType The OS of the agent. One of 'Linux', 'Darwin' or 'Windows_NT'.
   */
  static async getOcURLToDownload(version: BinaryVersion, osType: string): Promise<string> {
    if (!version.valid) {
      return undefined;
    }

    if (version.valid && version.type === 'url') {
      return version.value;
    }

    let url = InstallHandler.ocBundleURL(version.value, osType, false);
    let findURLofLatest = !url;
    if (url) {
      // check if url is valid otherwise take the latest stable oc cli for this version
      const response = await fetch(url, { method: 'HEAD' });
      findURLofLatest = !response.ok;
    }
    if (findURLofLatest) {
      url = InstallHandler.ocBundleURL(version.value, osType, true);
    }
    return url;
  }

  /**
   * Adds oc to the PATH environment variable.
   *
   * @param ocPath the full path to the oc binary. Must be a non null.
   * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
   */
  static addOcToPath(ocPath: string, osType: string): void {
    if (ocPath === null || ocPath === '') {
      throw new Error('path cannot be null or empty');
    }

    if (osType === 'Windows_NT') {
      const dir = ocPath.substr(0, ocPath.lastIndexOf('\\'));
      tl.setVariable('PATH', `${dir  };${  tl.getVariable('PATH')}`);
    } else {
      const dir = ocPath.substr(0, ocPath.lastIndexOf('/'));
      tl.setVariable('PATH', `${dir  }:${  tl.getVariable('PATH')}`);
    }
  }

  /**
   * Retrieve the oc CLI installed in the machine.
   *
   * @param version the version of `oc` to be used. If not specified any `oc` version, if found, will be used.
   * @return the installed executable
   */
  static getLocalOcBinary(version: BinaryVersion): FindBinaryStatus {
    let ocBinaryStatus: FindBinaryStatus;
    let ocPath: string | undefined;
    try {
      ocPath = tl.which('oc', true);
      ocBinaryStatus = { found: true, path: ocPath };
      tl.debug(`ocPath ${ocPath}`);
    } catch (ex) {
      ocBinaryStatus = { found: false };
      tl.debug(`Oc has not been found on this machine. Err ${  ex}`);
    }

    if (version.valid && version.type === 'number' && ocPath) {
      const localOcVersion: BinaryVersion = InstallHandler.getOcVersion(ocPath);
      tl.debug(`localOcVersion ${localOcVersion} vs ${version.value}`);
      if (!localOcVersion.valid || localOcVersion.value.toLowerCase() !== version.value.toLowerCase()) {
        ocBinaryStatus = { found: false };
      }
    }

    return ocBinaryStatus;
  }

  /**
   * Retrieve the version of the oc CLI found in path.
   *
   * @param ocPath the path of `oc` to be used
   * @return the version of oc
   */
  static getOcVersion(ocPath: string): BinaryVersion {
    let result: IExecSyncResult | undefined = RunnerHandler.execOcSync(ocPath, 'version --short=true --client=true', true);

    if (!result || result.stderr) {
      tl.debug(`error ${result && result.stderr ? result.stderr : ''}`);
      // if oc version failed we're dealing with oc < 4.1
      result = RunnerHandler.execOcSync(ocPath, 'version', true);
    }

    if (!result || !result.stdout) {
      return { valid: false, reason: `An error occured when retrieving version of oc CLI in ${ocPath}` };
    }

    tl.debug(`stdout ${result.stdout}`);
    const regexVersion = new RegExp('v[0-9]+.[0-9]+.[0-9]+');
    const versionObj = regexVersion.exec(result.stdout);

    if (versionObj && versionObj.length > 0) {
      return { valid: true, type: 'number', value: versionObj[0]};
    }

    return { valid: false, reason: `The version of oc CLI in ${ocPath} is in an unknown format.`};
  }

  /**
   * Retrieve the version of oc CLI in cache
   *
   * @param versionToCache version to search in cache
   * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
   */
  static versionInCache(version: string, osType: string): FindBinaryStatus {
    let cachePath: string;
    if (version) {
      cachePath = toolLib.findLocalTool('oc', version);
      if (cachePath) {
        return { found: true, path: path.join(cachePath, InstallHandler.ocBinaryByOS(osType)) };
      }
    }
    return { found: false };
  }

  static getOcUtils(): { [key: string]: string } {
    const rawData = fs.readFileSync(path.resolve(__dirname || '', 'oc-utils.json'), 'utf-8');
    return JSON.parse(rawData.toString());
  }

  private static versionToCache(version: string): string {
    const sanitizedVersion: semver.SemVer = semver.coerce(version);
    if (!sanitizedVersion) return undefined;
    return sanitizedVersion.version;
  }

  private static ocBinaryByOS(osType: string): string {
    if (osType === 'Windows_NT') return 'oc.exe';
    return 'oc';
  }
}
