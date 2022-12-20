/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/
import decompress = require('decompress');
import decompressTar = require('decompress-tar');
import decompressTargz = require('decompress-targz');
import Zip = require('adm-zip');

export async function unzipArchive(
  archiveType: string,
  archivePath: string,
  downloadDir: string
): Promise<void> {
  switch (archiveType) {
    case '.zip': {
      const zip = new Zip(archivePath);
      zip.extractAllTo(downloadDir);
      break;
    }
    case '.tar': {
      await decompress(archivePath, downloadDir, {
        filter: file => file.data.length > 0,
        plugins: [decompressTar()]
      });
      break;
    }
    case '.tgz':
    case '.tar.gz': {
      await decompress(archivePath, downloadDir, {
        filter: file => file.data.length > 0,
        plugins: [decompressTargz()]
      });
      break;
    }
    default: {
      return Promise.reject(new Error(`unknown archive format ${archivePath}`));
    }
  }
}
