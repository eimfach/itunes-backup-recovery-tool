const fs = require('fs');
const plist = require('simple-plist');
const readChunk = require('read-chunk');
const fileType = require('file-type');

const mimeTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'video/quicktime',
  'audio/m4a',
];

module.exports = {
  checkInfoAccess(path) {
    const filePath = path+'/Info.plist';
    fs.accessSync(filePath, fs.F_OK);
    return true;
  },
  /*
   * check if plist files exists and check if it's encrypted
   */
  getBackupInfo: function(path) {
    //TODO: READ files async and return Promise
    //TODO: READ manifest.plist PROPERTY BackupKeyBag
    const filePath = path+'/Info.plist';
    let info = {};
    if(fs.statSync(filePath)) {
      info = plist.readFileSync(filePath);
    }
    return info;
  },
  getSortedFileList: function({path, files}) {
    const fileList = {};
    files.forEach((file) => {
      const filePath = path+'/'+file;
      // read 'magic number' bytes
      const buffer = readChunk.sync(filePath, 0, 262);
      const fileDescriptionObject = fileType(buffer);

      // add to sorted list if a supported mime type was detected
      if(fileDescriptionObject && fileDescriptionObject.mime) {
        let mimeType = fileDescriptionObject.mime;
        if(mimeTypes.hasOwnProperty(mimeType)) {
          fileList[mimeType] = [filePath, ...fileList[mimeType] || []];
        }
      }
      return mimeList;
    });

    return fileList;
  },
  copyFile: function(source, target) {
      return new Promise(function(resolve, reject) {
          var rd = fs.createReadStream(source);
          rd.on('error', reject);
          var wr = fs.createWriteStream(target);
          wr.on('error', reject);
          wr.on('finish', resolve);
          rd.pipe(wr);
      });
  }
}
