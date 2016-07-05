'use strict'

const fs = require('fs')
const plist = require('simple-plist')
const readChunk = require('read-chunk')
const fileType = require('file-type')

const api = function (injectOptions) {
  const supportedMimeTypes = injectOptions.supportedMimeTypes
  return {
    checkInfoAccess (path) {
      const filePath = path + '/Info.plist'
      fs.accessSync(filePath, fs.F_OK)
      return true
    },
    /*
     * check if plist files exists and check if it's encrypted
     */
    getBackupInfo: function (path) {
      // TODO: READ manifest.plist PROPERTY BackupKeyBag
      return new Promise((resolve, reject) => {
        const filePath = path + '/Info.plist'
        plist.readFile(filePath, (err, data) => {
          if (!err) {
            resolve(data)
          } else {
            reject('Info.plist not readable.')
          }
        })
      })
    },
    getSortedFileList: function (options) {
      const path = options.path
      const files = options.files
      const mimeTypes = options.mimeTypes || supportedMimeTypes
      const fileList = {}

      files.forEach((file) => {
        const filePath = path + '/' + file

        // read 'magic number' bytes
        const buffer = readChunk.sync(filePath, 0, 262)
        const fileDescriptionObject = fileType(buffer)

        // add to sorted list if a supported mime type was detected
        if (fileDescriptionObject && fileDescriptionObject.mime) {
          let mimeType = fileDescriptionObject.mime
          if (mimeTypes.indexOf(mimeType) > -1) {
            if (fileList[mimeType] === undefined) {
              fileList[mimeType] = []
            }
            fileList[mimeType].push(filePath)
          }
        }
      })

      return fileList
    },
    copyFile: function (source, target) {
      return new Promise(function (resolve, reject) {
        var rd = fs.createReadStream(source)
        rd.on('error', reject)
        var wr = fs.createWriteStream(target)
        wr.on('error', reject)
        wr.on('finish', resolve)
        rd.pipe(wr)
      })
    }
  }
}

const supportedMimeTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'video/quicktime',
  'audio/m4a'
]

module.exports = Object.freeze({
  default: api({ supportedMimeTypes }),
  inject: api
})
