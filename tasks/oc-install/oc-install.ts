/// <reference path="../../typings/globals/node/index.d.ts" />
"use strict"

import tl = require('vsts-task-lib/task');
import fs = require('fs');
import os = require('os');
import { ToolRunner } from 'vsts-task-lib/toolrunner';

const octokit = require('@octokit/rest')()

export async function installOc(downloadVersion: string) {
    try {
        if (!downloadVersion) {
            downloadVersion = await latestStable();
        }

        let mkdir: ToolRunner = tl.tool("mkdir");

        tl.debug("creating bin directory for the binaries");
        let binDir = process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] + '/bin';
        mkdir.arg("-p").arg(binDir);
        await mkdir.exec();

        tl.debug("creating download directory for the tarballs");
        let downloadDir = process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] + '/download';
        mkdir.arg("-p").arg(downloadDir);
        await mkdir.exec();

        let url = await tarballURL(downloadVersion);
        if (url === null) {
            tl.setResult(tl.TaskResult.Failed, "Unable to determine oc download URL.");
            return
        }
        tl.debug(`downloading: ${url}`);
        
        let ocBinary = await downloadAndExtract(url, downloadDir);
        if (ocBinary === null) {
            tl.setResult(tl.TaskResult.Failed, "Unable to download or extract oc binary.");
            return
        }

        tl.debug("copy oc binary");
        let cp = tl.tool("cp");
        cp.arg(ocBinary).arg(binDir);
        await cp.exec();

        tl.debug("updating PATH");
        tl.setVariable("PATH", binDir + ':' + tl.getVariable("PATH"));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
        throw (err);
    }
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
        .then(result => {
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
export async function tarballURL(tag: string): Promise<string> {
    tl.debug("determinig tarbal URL");

    if (!tag) {
        return null;
    }

    let url = await octokit.repos.getReleaseByTag({
        owner: 'openshift',
        repo: 'origin',
        tag: tag
    })
        .then(result => {
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
        .catch(function(e) {
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
export async function downloadAndExtract(url: string, downloadDir: string) {
    if (!url) {
        return null;
    }

    if (!fs.existsSync(downloadDir)) {
        throw `${downloadDir} does not exist.`;
    }

    let parts = url.split('/');
    let tarball = parts[parts.length-1]
    let targetFile = downloadDir +  `/${tarball}`

    if (!fs.existsSync(targetFile)) {
        let curl: ToolRunner = tl.tool("curl");
        curl.arg("-L").arg("-o").arg(targetFile).arg(url);
        await curl.exec();
    }

    let expandDir = tarball.replace('.tar.gz','')
    let expandPath = downloadDir + `/${expandDir}`
    if (!fs.existsSync(expandPath)) {
        tl.debug(`expanding ${targetFile}`);

        let tarBinary = "tar"
        // to make it easier to develop on macOS
        if (os.platform() == "darwin") {
            tarBinary = "gnutar"
        }
        // Note: -C option does not seem to work
        // /usr/bin/tar: D\:\a\r1\a/download: Cannot open: No such file or directory
        let tar: ToolRunner = tl.tool(tarBinary);
        tar.arg("--force-local").arg("-xvf").arg(targetFile)
        await tar.exec();

        let mv: ToolRunner = tl.tool("mv");
        mv.arg(expandDir).arg(downloadDir)
        await mv.exec();
    }

    let ocBinary = `${expandPath}/oc`
    if (!fs.existsSync(ocBinary)) {
        return null
    } else {
        return ocBinary
    }
}
