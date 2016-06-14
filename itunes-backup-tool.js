#!/usr/bin/env node
'use strict';

const fileType = require('file-type');
const readChunk = require('read-chunk');
const uuid = require('node-uuid');
const fs = require('fs');
const plist = require('simple-plist');

const EOL = require('os').EOL;

const doCheck = process.argv[2] === 'check';
const doCopy = process.argv[2] === 'copy';
const path = process.argv[3];
const dest = process.argv[4];
const mimeTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'video/quicktime',
  'audio/m4a',
];
const fileExt = {
  'image/png': '.png',
  'image/jpeg': '.jpeg',
  'image/jpg': '.jpg',
  'video/quicktime': '.mov',
  'audio/m4a': '.m4a',
}
let files;

if(['-h', '--h', '-help', '--help'].indexOf(process.argv[2]) > -1 ) {
  process.stdout.write('check [path]'+EOL+'copy [path] [destination]'+EOL);
  process.exit(0);
}
if(!process.argv[2]) {
  process.stderr.write(errorMsg('Missing action param!')+EOL);
  process.exit(1);
}
if(!path) {
  process.stderr.write(errorMsg('Missing read path param!')+EOL);
  process.exit(1);
}
if(doCopy && !dest) {
  process.stderr.write(errorMsg('Missing destination path param')+EOL);
  process.exit(1);
}

process.stdout.write('-> Try to read files in path: '+path+EOL);

// list infomations about this backup
if(fs.statSync(path+'/Info.plist')) {
  const info = plist.readFileSync(path+'/Info.plist');
  process.stdout.write(infoMsg(info['Device Name'])+EOL);
  process.stdout.write('IMEI: '+infoMsg(info['IMEI'])+EOL);
  process.stdout.write('Date: '+ infoMsg(new Date(info['Last Backup Date'])) +EOL);
  process.stdout.write('Product Type: '+ infoMsg(info['Product Type'])+EOL);
  process.stdout.write('Product Version: '+ infoMsg(info['Product Version'])+EOL);
}
// check if plist files exists and check if it's encrypted
// READ manifest.plist PROPERTY BackupKeyBag

try {
  files = fs.readdirSync(path);
  process.stdout.write('-> Found '+files.length+' files.'+EOL);
} catch (e) {
  process.stderr.write(errorMsg('Failed to read from this path!'+EOL))
}

process.stdout.write('-> Checking filetypes in this backup......'+EOL);
// read the actual types of the files via the 'magic number' bytes
const fileList = getSortedFileList(files);

if(doCheck) {
  Object.keys(fileList).forEach((keyAsMime) => {
    const filesOfType = fileList[keyAsMime].length;
    process.stdout.write('-> ' + infoMsg(filesOfType) + ' files of type: ' + keyAsMime +EOL );
  });
  process.exit(0);
}

if(doCopy) {
  process.stderr.write('-> Starting copy process (async) to '+dest+' ....'+EOL);

  let copyPromises = [];
  Object.keys(fileList).forEach((keyAsMime) => {
    fileList[keyAsMime].forEach((filePath) => {
      const promiseCopy = copyFile(filePath, dest+'/'+uuid.v4()+fileExt[keyAsMime]);
      copyPromises.push(promiseCopy);
    })
  });
  Promise.all(copyPromises)
  .then(() => {
    process.stdout.write('-> Copy successful'+EOL);
    process.exit(0);
  })
  .catch((e) => {
    process.stderr.write(errorMsg(e.message)+EOL);
    process.exit(1);
  });

}

function errorMsg(msg) {
  return '\x1b[31m' + msg + '\x1b[0m';
}
function infoMsg(msg) {
  return '\x1b[34m' + msg + '\x1b[0m'
}

function getSortedFileList(files) {
  function fileIterate(files, cb) {
    let response;
    files.forEach((file) => {
      const filePath = path+'/'+file;
      response = cb(filePath);
    });
    return response;
  }

  const fileList = fileIterate(files, (() => {
    let mimeList = {};
    // init sorted list with the supported mime types as keys
    mimeTypes.forEach((mimeType) => {
      mimeList[mimeType] = [];
    });
    return (filePath) => {
      // read 'magic number' bytes
      const buffer = readChunk.sync(filePath, 0, 262);
      const fileDescriptionObject = fileType(buffer);

      // add to sorted list if a mime type was detected
      if(fileDescriptionObject && fileDescriptionObject.mime) {
        let mimeType = fileDescriptionObject.mime;
        if(mimeList.hasOwnProperty(mimeType)) {
          mimeList[mimeType].push(filePath);
        }
      }
      return mimeList;
    }
  })());

  return fileList;
}

function copyFile (source, target) {
    return new Promise(function(resolve, reject) {
        var rd = fs.createReadStream(source);
        rd.on('error', reject);
        var wr = fs.createWriteStream(target);
        wr.on('error', reject);
        wr.on('finish', resolve);
        rd.pipe(wr);
    });
}
