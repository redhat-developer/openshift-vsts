const decompress = require('decompress');
const decompressTargz = require('decompress-targz');
const Zip = require('adm-zip');

export async function unzipArchive(archiveType: string, archivePath: string, downloadDir: string) {
    switch (archiveType) {
        case '.zip': {
          let zip = new Zip(archivePath);
          zip.extractAllTo(downloadDir);
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
          throw `unknown archive format ${archivePath}`;
        }
    }
}