const sendPhoto = require('./sendPhoto');
const sendFile = require('./sendFile');
const uploadPhoto = require('./uploadPhoto');
const uploadFile = require('./uploadfFile');
const { uploadVideoWeb, uploadAudioWeb, getCookiesFromSession } = require('./uploadWebMedia');

module.exports = {
  sendPhoto,
  sendFile,
  uploadPhoto,
  uploadFile,
  uploadVideoWeb,
  uploadAudioWeb,
  getCookiesFromSession,
};
