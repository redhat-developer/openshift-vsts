'use strict';

import tl = require('vsts-task-lib/task');
import fs = require('fs');
import path = require('path');
import { ToolRunner, IExecSyncResult } from 'vsts-task-lib/toolrunner';
import { execOcSync } from './oc-exec';
import { LINUX, OC_TAR_GZ, MACOSX, WIN, OC_ZIP, OPENSHIFT_V3_BASE_URL, OPENSHIFT_V4_BASE_URL } from './constants';

const validUrl = require('valid-url');
const decompress = require('decompress');
const decompressTargz = require('decompress-targz');
const Zip = require('adm-zip');
const octokit = require('@octokit/rest')();

if (process.env['GITHUB_ACCESS_TOKEN']) {
  tl.debug('using octokit with token based authentication');
  octokit.authenticate({
    type: 'token',
    token: process.env['GITHUB_ACCESS_TOKEN']
  });
}

export class InstallHandler {
  /**
   * Downloads the specified version of the oc CLI and returns the full path to
   * the executable.
   *
   * @param downloadVersion the version of `oc` to install.
   * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'. See https://nodejs.org/api/os.html#os_os_type
   * @return the full path to the installed executable or null if the install failed.
   */
  static async installOc(
    downloadVersion: string,
    osType: string,
    useLocalOc: boolean
  ): Promise<string | null> {
    if (useLocalOc) {
      const localOcPath = InstallHandler.getLocalOcPath(downloadVersion);
      if (localOcPath) {
        return localOcPath;
      }
    }

    if (!downloadVersion) {
      downloadVersion = await InstallHandler.latestStable();
    }

    tl.debug('creating download directory');
    let downloadDir =
      process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] + '/.download';
    if (!fs.existsSync(downloadDir)) {
      let mkdir: ToolRunner = tl.tool('mkdir');
      mkdir.arg('-p').arg(downloadDir);
      await mkdir.exec();
    }

    let url: string | null;
    if (validUrl.isWebUri(downloadVersion)) {
      url = downloadVersion;
    } else {
      url = await InstallHandler.ocBundleURL(downloadVersion, osType);
    }

    if (url === null) {
      return Promise.reject('Unable to determine oc download URL.');
    }

    tl.debug(`downloading: ${url}`);
    let ocBinary = await InstallHandler.downloadAndExtract(
      url,
      downloadDir,
      osType
    );
    if (ocBinary === null) {
      return Promise.reject('Unable to download or extract oc binary.');
    }

    return ocBinary;
  }

  /**
   * Determines the latest stable version of the OpenShift CLI on GitHub.
   * The version is also used as release tag.
   *
   * @return the release/tag of the latest OpenShift CLI on GitHub.
   */
  static async latestStable(): Promise<string> {
    tl.debug('determining latest oc version');

    let version = await octokit.repos
      .getLatestRelease({
        owner: 'openshift',
        repo: 'origin'
      })
      .then((result: any) => {
        if (result.data.length === 0) {
          console.log('Repository has no releases');
          return 'v1.13.0';
        }
        return result.data.tag_name;
      });

    tl.debug(`latest stable oc version: ${version}`);
    return version;
  }

  /**
   * Returns the download URL for the oc CLI for a given release tag.
   * The binary type is determined by the agent's operating system.
   *
   * @param {string} version Oc version.
   * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
   * @returns {Promise} Promise string representing the URL to the tarball. null is returned
   * if no matching URL can be determined for the given tag.
   */
  static async ocBundleURL(
    version: string,
    osType: string
  ): Promise<string | null> {
    tl.debug(`determining tarball URL for version ${version}`);

    if (!version) {
      return null;
    }

    // remove char v if present to ensure old pipelines keep working when the extension will be updated
    if (version.startsWith('v')) {
      version = version.substr(1);
    }

    let url: string = '';
    // determine the base_url based on version
    const vMajorRegEx: RegExpExecArray = new RegExp('\d+(?=\.)').exec(version);
    if (!vMajorRegEx || vMajorRegEx.length === 0) {
      tl.debug('Error retrieving version');
      return null;
    }
    const vMajor: number = +vMajorRegEx[0];

    if (vMajor === 3) {
      url = `${OPENSHIFT_V3_BASE_URL}/${version}`;
    } else if (vMajor === 4) {
      url = `${OPENSHIFT_V4_BASE_URL}/${version}`;
    } else {
      tl.debug('Invalid version');
      return null;
    }

    // determine the bundle path based on the OS type
    switch (osType) {
      case 'Linux': {
        url += `${LINUX}/${OC_TAR_GZ}`;
        break;
      }
      case 'Darwin': {
        url += `${MACOSX}/${OC_TAR_GZ}`;
        break;
      }
      case 'Windows_NT': {
        url += `${WIN}/${OC_ZIP}`;
        break;
      }
      default: {
        return null;
      }
    }

    url = await octokit.repos
      .getReleaseByTag({
        owner: 'openshift',
        repo: 'origin',
        tag: version
      })
      .then((result: any) => {
        if (result.data.length === 0) {
          console.log('No tarball found');
          return null;
        }

        for (let asset of result.data.assets) {
          url = asset.browser_download_url;
        }
        return null;
      })
      .catch(function(e: any) {
        tl.debug(`Error retrieving tagged release ${e}`);
        return null;
      });
    tl.debug(`archive URL: ${url}`);
    return url;
  }

  /**
   * Downloads and extract the oc release archive.
   *
   * @param url the oc release download URL.
   * @param downloadDir the directory into which to extract the archive.
   * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
   * It is the responsibility of the caller to ensure that the directory exist.
   */
  static async downloadAndExtract(
    url: string,
    downloadDir: string,
    osType: string
  ): Promise<string | null> {
    if (!url) {
      return null;
    }

    downloadDir = path.normalize(downloadDir);

    if (!tl.exist(downloadDir)) {
      throw `${downloadDir} does not exist.`;
    }

    let parts = url.split('/');
    let archive = parts[parts.length - 1];
    let archivePath = path.join(downloadDir, archive);

    if (!tl.exist(archivePath)) {
      let curl: ToolRunner = tl.tool('curl');
      curl
        .arg('-s')
        .arg('-L')
        .arg('-o')
        .arg(archivePath)
        .arg(url);
      await curl.exec();
    }

    let archiveType = path.extname(archive);
    let expandDir = archive.replace(archiveType, '');
    // handle tar.gz explicitly
    if (path.extname(expandDir) == '.tar') {
      archiveType = '.tar.gz';
      expandDir = expandDir.replace('.tar', '');
    }

    let expandPath = path.join(downloadDir, expandDir);
    if (!tl.exist(expandPath)) {
      tl.debug(`expanding ${archivePath} into ${expandPath}`);

      switch (archiveType) {
        case '.zip': {
          let zip = new Zip(archivePath);
          zip.extractAllTo(expandPath);
          break;
        }
        case '.tgz':
        case '.tar.gz': {
          await decompress(archivePath, downloadDir, {
            plugins: [decompressTargz()]
          });
          break;
        }
        default: {
          throw `unknown archive format ${archivePath}`;
        }
      }
    }

    let ocBinary: string;
    switch (osType) {
      case 'Windows_NT': {
        ocBinary = 'oc.exe';
        break;
      }
      default: {
        ocBinary = 'oc';
      }
    }

    ocBinary = path.join(expandPath, ocBinary);
    if (!tl.exist(ocBinary)) {
      return null;
    } else {
      fs.chmodSync(ocBinary, '0755');
      return ocBinary;
    }
  }

  /**
   * Adds oc to the PATH environment variable.
   *
   * @param ocPath the full path to the oc binary. Must be a non null.
   * @param osType the OS type. One of 'Linux', 'Darwin' or 'Windows_NT'.
   */
  static async addOcToPath(ocPath: string, osType: string) {
    if (ocPath === null || ocPath === '') {
      throw new Error('path cannot be null or empty');
    }

    if (osType == 'Windows_NT') {
      let dir = ocPath.substr(0, ocPath.lastIndexOf('\\'));
      tl.setVariable('PATH', dir + ';' + tl.getVariable('PATH'));
    } else {
      let dir = ocPath.substr(0, ocPath.lastIndexOf('/'));
      tl.setVariable('PATH', dir + ':' + tl.getVariable('PATH'));
    }
  }

  /**
   * Retrieve the path of the oc CLI installed in the machine.
   *
   * @param version the version of `oc` to be used. If not specified any `oc` version, if found, will be used.
   * @return the full path to the installed executable or undefined if the oc CLI version requested is not found.
   */
  static getLocalOcPath(version?: string): string | undefined {
    let ocPath: string | undefined = undefined;
    try {
      ocPath = tl.which('oc', true);
      tl.debug(`ocPath ${ocPath}`);
    } catch (ex) {
      tl.debug('Oc has not been found on this machine. Err ' + ex);
    }

    if (version && ocPath) {
      const localOcVersion = InstallHandler.getOcVersion(ocPath);
      tl.debug(`localOcVersion ${localOcVersion} vs ${version}`);
      if (
        !localOcVersion ||
        localOcVersion.toLowerCase() !== version.toLowerCase()
      ) {
        return undefined;
      }
    }

    return ocPath;
  }

  static getOcVersion(ocPath: string) {
    let result: IExecSyncResult | undefined = execOcSync(
      ocPath,
      'version --short=true --client=true'
    );

    if (!result || result.stderr) {
      tl.debug(`error ${result && result.stderr ? result.stderr : ''}`);
      // if oc version failed we're dealing with oc < 4.1
      result = execOcSync(ocPath, 'version');
    }

    if (!result || !result.stdout) {
      tl.debug('stdout empty');
      return undefined;
    }

    tl.debug(`stdout ${result.stdout}`);
    const regexVersion = new RegExp('v[0-9]+.[0-9]+.[0-9]+');
    const versionObj = regexVersion.exec(result.stdout);

    if (versionObj && versionObj.length > 0) {
      return versionObj[0];
    }

    return undefined;
  }
}
