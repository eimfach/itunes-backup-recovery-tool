#!/usr/bin/env node
'use strict'

const tool = require('./index.js').default
const uuid = require('node-uuid')
const fs = require('fs')

const EOL = require('os').EOL

const doCheck = process.argv[2] === 'check'
const doCopy = process.argv[2] === 'copy'
const path = process.argv[3]
const dest = process.argv[4]

const fileExt = {
  'image/png': '.png',
  'image/jpeg': '.jpeg',
  'image/jpg': '.jpg',
  'video/quicktime': '.mov',
  'audio/m4a': '.m4a'
}

function errorMsg (msg) {
  return '\x1b[31m' + msg + '\x1b[0m'
}
function infoMsg (msg) {
  return '\x1b[34m' + msg + '\x1b[0m'
}

function handleMainTask () {
  process.stdout.write('-> Try to read files in path: ' + path + EOL)

  try {
    files = fs.readdirSync(path)
    process.stdout.write('-> Found ' + files.length + ' files.' + EOL)
  } catch (e) {
    process.stderr.write(errorMsg('Failed to read from this path!' + EOL))
  }

  process.stdout.write('-> Checking supported filetypes in this backup......' + EOL)
  // read the actual types of the files via the 'magic number' bytes
  const fileList = tool.getSortedFileList({path, files})

  if (doCheck) {
    Object.keys(fileList).forEach((keyAsMime) => {
      const filesOfType = fileList[keyAsMime].length
      process.stdout.write('-> ' + infoMsg(filesOfType) + ' files of type: ' + keyAsMime + EOL)
    })
    process.exit(0)
  } else if (doCopy) {
    let destExists = false

    try {
      fs.statSync(dest)
      destExists = true
    } catch (e) {
      // directory does not exist or is not readable
    }
    if (!destExists) {
      fs.mkdirSync(dest)
    }
    process.stderr.write('-> Starting copy process to ' + dest + ' ....' + EOL)

    let copyPromises = []
    Object.keys(fileList).forEach((keyAsMime) => {
      fileList[keyAsMime].forEach((filePath) => {
        const promiseCopy = tool.copyFile(filePath, dest + '/' + uuid.v4() + fileExt[keyAsMime])
        copyPromises.push(promiseCopy)
      })
    })
    Promise.all(copyPromises)
    .then(() => {
      process.stdout.write('-> Copy successful' + EOL)
      process.exit(0)
    })
    .catch((e) => {
      process.stderr.write(errorMsg(e.message) + EOL)
      process.exit(1)
    })
  } else {
    process.stderr.write(errorMsg('No main task specified.') + EOL)
  }
}

let files

if (['-h', '--h', '-help', '--help'].indexOf(process.argv[2]) > -1) {
  process.stdout.write('check [path]' + EOL + 'copy [path] [destination]' + EOL)
  process.exit(0)
}
if (!process.argv[2]) {
  process.stderr.write(errorMsg('Missing action param!') + EOL)
  process.exit(1)
}
if (!path) {
  process.stderr.write(errorMsg('Missing read path param!') + EOL)
  process.exit(1)
}
if (doCopy && !dest) {
  process.stderr.write(errorMsg('Missing destination path param') + EOL)
  process.exit(1)
}

tool.getBackupInfo(path)
.then((info) => {
  process.stdout.write(infoMsg(info['Device Name']) + EOL)
  process.stdout.write('IMEI: ' + infoMsg(info['IMEI']) + EOL)
  process.stdout.write('Date: ' + infoMsg(new Date(info['Last Backup Date'])) + EOL)
  process.stdout.write('Product Type: ' + infoMsg(info['Product Type']) + EOL)
  process.stdout.write('Product Version: ' + infoMsg(info['Product Version']) + EOL)
  handleMainTask()
})
.catch((err) => {
  let info = infoMsg('Info.plist seems not to exist in this Backup. It is possible that this Backup is incomplete.' + EOL)
  process.stdout.write(errorMsg(err) + EOL)
  process.stdout.write(info)
  handleMainTask()
})
