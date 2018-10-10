"use strict"

import tl = require('vsts-task-lib/task');
import fs = require('fs');
import { ToolRunner } from 'vsts-task-lib/toolrunner';

const octokit = require('@octokit/rest')()

export async function installOc(downloadVersion: string):  Promise<string | null> {
    if (!downloadVersion) {
        downloadVersion = await latestStable();
    }

    tl.debug("creating download directory for the tarballs");
    let downloadDir = process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] + '/.download';
    if (!fs.existsSync(downloadDir)) {
        let mkdir: ToolRunner = tl.tool("mkdir");
        mkdir.arg("-p").arg(downloadDir);
        await mkdir.exec();
    }

    let url = await tarballURL(downloadVersion);
    if (url === null) {
        tl.setResult(tl.TaskResult.Failed, "Unable to determine oc download URL.");
        return null;
    }
    tl.debug(`downloading: ${url}`);

    let ocBinary = await downloadAndExtract(url, downloadDir);
    if (ocBinary === null) {
        tl.setResult(tl.TaskResult.Failed, "Unable to download or extract oc binary.");
        return null;
    } 

    return ocBinary;
}

/**
 * Determines the latest stable version of the OpenShift CLI on GitHub.
 * The version is also used as release tag.
 * 
 * @return the release/tag of the latest OpenShift CLI on GitHub.
 */
export async function latestStable(): Promise<string> {
    tl.debug("determinig latest oc version");

    let version = await octokit.repos.getLatestRelease({
        owner: 'openshift',
        repo: 'origin'
    })
        .then((result: any) => {
            if (result.data.length === 0) {
                console.log('Repository has no releases')
                return "v1.13.0"
            }
            return result.data.tag_name;
        })
    return version;
}

/**
 * Returns the tarball download URL for the Linux oc CLI for a given release tag.
 * 
 * @param {string} tag The release tag.
 * @returns {Promise} Promise string representing the URL to the tarball. null is returned
 * if no matching URL can be determined for the given tag.
 */
export async function tarballURL(tag: string): Promise<string | null> {
    tl.debug("determinig tarbal URL");

    if (!tag) {
        return null;
    }

    let url = await octokit.repos.getReleaseByTag({
        owner: 'openshift',
        repo: 'origin',
        tag: tag
    })
        .then((result: any) => {
            if (result.data.length === 0) {
                console.log('No tarball found')
                return null
            }

            let url: string;
            for (var asset of result.data.assets) {
                url = asset.browser_download_url
                tl.debug(url);
                if (url.match(/^.*linux-64bit.tar.gz$/)) {
                    return url;
                }
            }
            return null;
        })
        .catch(function (e: any) {
            tl.debug(`Error retrieving tagged release ${e}`);
            return null;
        })
    return url;
}

/**
 * Downloads and extract the oc release tarball.
 * 
 * @param url the oc release download URL.
 * @param downloadDir the directory into which to extract the tarball. 
 * It is the responsbiltiy of the caller to ensure that the directory exist.
 */
export async function downloadAndExtract(url: string, downloadDir: string): Promise<string | null> {
    if (!url) {
        return null;
    }

    if (!fs.existsSync(downloadDir)) {
        throw `${downloadDir} does not exist.`;
    }

    let parts = url.split('/');
    let tarball = parts[parts.length - 1]
    let targetFile = downloadDir + `/${tarball}`

    if (!fs.existsSync(targetFile)) {
        let curl: ToolRunner = tl.tool("curl");
        curl.arg("-L").arg("-o").arg(targetFile).arg(url);
        await curl.exec();
    }

    let expandDir = tarball.replace('.tar.gz', '')
    let expandPath = downloadDir + `/${expandDir}`
    if (!fs.existsSync(expandPath)) {
        tl.debug(`expanding ${targetFile}`);

        let tar: ToolRunner = tl.tool("tar");
        tar.arg("-xvf").arg(targetFile).arg("-C").arg(downloadDir)
        await tar.exec();
    }

    let ocBinary = `${expandPath}/oc`
    if (!fs.existsSync(ocBinary)) {
        return null
    } else {
        return ocBinary
    }
}
