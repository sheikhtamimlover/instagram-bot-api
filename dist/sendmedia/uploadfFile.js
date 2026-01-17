/**
 * uploadFile.js
 * Robust upload helper for videos/audio to Instagram rupload.
 * Uses single upload approach (matching upload.repository.js pattern).
 */

const { v4: uuidv4 } = require('uuid');
const { random } = require('lodash');

/**
 * Validate upload input
 */
function validateFileInput(fileBuffer, mimeType) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new Error('uploadFile: fileBuffer must be a non-empty Buffer.');
  }
  if (typeof mimeType !== 'string' || mimeType.length === 0) {
    throw new Error('uploadFile: mimeType must be a non-empty string (e.g., "video/mp4").');
  }
}

/**
 * Upload file (video/audio) via rupload - single upload approach.
 *
 * @param {object} session - Authenticated session with request.send
 * @param {Buffer} fileBuffer - File data buffer
 * @param {object} [options]
 * @param {string} [options.mimeType='video/mp4'] - e.g., 'video/mp4', 'audio/mpeg', 'audio/mp4'
 * @param {number} [options.duration_ms] - Duration in ms (optional)
 * @param {number} [options.width] - Video width (optional)
 * @param {number} [options.height] - Video height (optional)
 * @returns {Promise<string>} upload_id
 */
async function uploadFile(session, fileBuffer, options = {}) {
  const {
    mimeType = 'video/mp4',
    duration_ms = 60000,
    width = 1280,
    height = 720,
  } = options;

  validateFileInput(fileBuffer, mimeType);

  const uploadId = Date.now().toString();
  const name = `${uploadId}_0_${random(1000000000, 9999999999)}`;
  const waterfallId = uuidv4();

  const ruploadParams = {
    retry_context: JSON.stringify({
      num_step_auto_retry: 0,
      num_reupload: 0,
      num_step_manual_retry: 0,
    }),
    media_type: '2',
    xsharing_user_ids: JSON.stringify([]),
    upload_id: uploadId,
    upload_media_duration_ms: String(duration_ms),
    upload_media_width: String(width),
    upload_media_height: String(height),
  };

  const headers = {
    'X-FB-Video-Waterfall-ID': waterfallId,
    'X-Entity-Type': mimeType,
    'Offset': '0',
    'X-Instagram-Rupload-Params': JSON.stringify(ruploadParams),
    'X-Entity-Name': name,
    'X-Entity-Length': fileBuffer.length.toString(),
    'Content-Type': 'application/octet-stream',
    'Content-Length': fileBuffer.length.toString(),
    'Accept-Encoding': 'gzip',
  };

  try {
    const response = await session.request.send({
      url: `/rupload_igvideo/${name}`,
      method: 'POST',
      headers,
      data: fileBuffer,
    });

    const serverUploadId = response?.body?.upload_id || response?.upload_id || uploadId;
    return serverUploadId;
  } catch (err) {
    const message = err?.message || 'Unknown error';
    throw new Error(`uploadFile: Upload failed — ${message}`);
  }
}

module.exports = uploadFile;
