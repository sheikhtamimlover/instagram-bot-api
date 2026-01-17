/**
 * sendPhoto.js
 * High-level helper to send a photo to Instagram Direct (DM or Group).
 *
 * Uses the IgApiClient's built-in upload and broadcast methods for reliability.
 *
 * Supports:
 *  - Send to a single user by userId (recipient_users)
 *  - Send to an existing thread (group) by threadId
 *  - Optional caption
 *
 * Usage:
 *   const sendPhoto = require('./sendPhoto');
 *   await sendPhoto(igClient, {
 *     photoBuffer: fs.readFileSync('./image.jpg'),
 *     threadId: '340282366841710300949128123456789',
 *     caption: 'Hello!',
 *   });
 *
 * Notes:
 *  - Uses client.upload.photo() for upload
 *  - Uses client.directThread.broadcast() for broadcast
 *  - Exactly one of { userId, threadId } must be provided.
 */

const { v4: uuidv4 } = require('uuid');
const uploadPhoto = require('./uploadPhoto');

/**
 * @typedef {Object} SendPhotoOptions
 * @property {Buffer} photoBuffer - Required image buffer (JPEG/PNG)
 * @property {string} [mimeType='image/jpeg'] - 'image/jpeg' | 'image/png'
 * @property {string} [fileName] - Optional file name (will be sanitized)
 * @property {string} [caption] - Optional caption text
 * @property {string} [userId] - Send to user (DM) — exactly one of userId or threadId
 * @property {string} [threadId] - Send to existing thread (group or DM) — exactly one of userId or threadId
 * @property {string[]} [mentions] - Optional array of userIds mentioned in caption
 * @property {AbortSignal} [signal] - Optional AbortSignal to cancel
 */

/**
 * Send a photo to Instagram Direct.
 * Internally:
 *  - Uploads photo via rupload to get upload_id
 *  - Broadcasts the uploaded photo to either a user (DM) or an existing thread using configure_photo
 *
 * @param {object} session - Authenticated session (with request.send)
 * @param {SendPhotoOptions} opts - Options
 * @returns {Promise<object>} Instagram response object
 */
async function sendPhoto(session, opts = {}) {
  const {
    photoBuffer,
    mimeType = 'image/jpeg',
    fileName,
    caption = '',
    userId,
    threadId,
    mentions = [],
    signal,
  } = opts;

  // Validate destination
  if (!userId && !threadId) {
    throw new Error('sendPhoto: You must provide either userId (DM) or threadId (existing thread).');
  }
  if (userId && threadId) {
    throw new Error('sendPhoto: Provide only one destination — userId OR threadId, not both.');
  }
  // Validate photo buffer
  if (!photoBuffer || !Buffer.isBuffer(photoBuffer) || photoBuffer.length === 0) {
    throw new Error('sendPhoto: photoBuffer must be a non-empty Buffer.');
  }
  
  // Debug: Check session state
  console.log('[sendPhoto] Session state check:', {
    hasRequest: !!session?.request,
    hasRequestSend: !!session?.request?.send,
    hasState: !!session?.state,
    hasCsrf: !!session?.state?.cookieCsrfToken,
    csrfValue: session?.state?.cookieCsrfToken,
    hasDeviceId: !!session?.state?.deviceId,
    deviceIdValue: session?.state?.deviceId,
    hasUuid: !!session?.state?.uuid,
    uuidValue: session?.state?.uuid
  });
  
  // Validate session has required properties
  if (!session?.request?.send) {
    throw new Error('sendPhoto: session.request.send is not available');
  }
  if (!session?.state) {
    throw new Error('sendPhoto: session.state is not available');
  }

  // 1) Upload photo to get upload_id
  console.log('[sendPhoto] Step 1: Uploading photo...');
  const upload_id = await uploadPhoto(session, photoBuffer, { mimeType, fileName, signal });
  console.log('[sendPhoto] Upload successful, upload_id:', upload_id);

  // 2) Generate mutation token for this send action
  const mutationToken = uuidv4();

  // 3) Build form payload for configure_photo endpoint
  const form = {
    action: 'send_item',
    client_context: mutationToken,
    _csrftoken: session.state.cookieCsrfToken,
    device_id: session.state.deviceId,
    mutation_token: mutationToken,
    _uuid: session.state.uuid,
    upload_id: upload_id,
    allow_full_aspect_ratio: 'true',
  };

  // 4) Add caption if provided
  if (caption) {
    form.caption = caption;
  }

  // 5) Mentions (optional): IG expects entities when caption includes mentions
  if (Array.isArray(mentions) && mentions.length > 0) {
    form.entities = JSON.stringify(
      mentions.map((uid) => ({
        user_id: String(uid),
        type: 'mention',
      }))
    );
  }

  // 6) Destination-specific fields
  if (userId) {
    form.recipient_users = JSON.stringify([[String(userId)]]);
  } else {
    form.thread_ids = JSON.stringify([String(threadId)]);
  }

  // 7) Send broadcast request using configure_photo endpoint
  const url = '/api/v1/direct_v2/threads/broadcast/configure_photo/';
  
  console.log('[sendPhoto] Step 2: Broadcasting to thread...');
  console.log('[sendPhoto] Form data:', JSON.stringify(form, null, 2));
  
  try {
    const response = await session.request.send({
      url,
      method: 'POST',
      form,
      signal,
    });

    console.log('[sendPhoto] Broadcast response:', response ? 'received' : 'null', typeof response);
    if (response) {
      console.log('[sendPhoto] Response body:', JSON.stringify(response.body || response, null, 2).slice(0, 500));
    }

    if (!response) {
      throw new Error('sendPhoto: Empty response from Instagram broadcast endpoint.');
    }
    
    // Check for error in response body
    const body = response.body || response;
    if (body && body.status === 'fail') {
      throw new Error(body.message || 'Unknown failure from Instagram');
    }
    
    return response;
  } catch (err) {
    console.log('[sendPhoto] Configure failed, trying upload_photo endpoint...');
    console.log('[sendPhoto] Error was:', err.message);
    // Try alternative broadcast endpoint (upload_photo)
    try {
      const altUrl = '/api/v1/direct_v2/threads/broadcast/upload_photo/';
      const altResponse = await session.request.send({
        url: altUrl,
        method: 'POST',
        form,
        signal,
      });
      
      if (altResponse) {
        const altBody = altResponse.body || altResponse;
        if (altBody && altBody.status !== 'fail') {
          return altResponse;
        }
      }
    } catch (altErr) {
      // Fallback failed, throw original error
    }
    
    throw new Error(`sendPhoto: Broadcast failed — ${normalizeError(err)}`);
  }
}

/**
 * Normalize error shapes to readable text.
 */
function normalizeError(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unserializable error';
  }
}

module.exports = sendPhoto;
