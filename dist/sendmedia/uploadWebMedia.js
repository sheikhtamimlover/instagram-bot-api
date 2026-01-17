/**
 * uploadWebMedia.js
 * Web-based upload for video/audio using Instagram's web API (ajax/mercury/upload.php)
 * Based on captured browser network requests (cvid.js, caui.js)
 */

const axios = require('axios');
const FormData = require('form-data');

/**
 * Upload video using web API
 * @param {object} session - Authenticated session with state.cookieJar
 * @param {Buffer} fileBuffer - Video file buffer
 * @param {object} options - Upload options
 * @param {object} options.webCookies - Optional explicit web cookies (sessionid, csrftoken, etc.)
 * @returns {Promise<object>} Response with video_id, thumbnail_src, etc.
 */
async function uploadVideoWeb(session, fileBuffer, options = {}) {
  const {
    fileName = `video_${Date.now()}.mp4`,
    mimeType = 'video/mp4',
    webCookies = null,
  } = options;

  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new Error('uploadVideoWeb: fileBuffer must be a non-empty Buffer.');
  }

  return await uploadMediaWeb(session, fileBuffer, fileName, mimeType, 'video', webCookies);
}

/**
 * Upload audio using web API
 * @param {object} session - Authenticated session
 * @param {Buffer} fileBuffer - Audio file buffer
 * @param {object} options - Upload options
 * @param {object} options.webCookies - Optional explicit web cookies (sessionid, csrftoken, etc.)
 * @returns {Promise<object>} Response with audio_id, etc.
 */
async function uploadAudioWeb(session, fileBuffer, options = {}) {
  const {
    fileName = `audio_${Date.now()}.m4a`,
    mimeType = 'audio/x-m4a',
    webCookies = null,
  } = options;

  if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
    throw new Error('uploadAudioWeb: fileBuffer must be a non-empty Buffer.');
  }

  return await uploadMediaWeb(session, fileBuffer, fileName, mimeType, 'audio', webCookies);
}

/**
 * Core web upload function using axios directly
 * @param {object|null} explicitCookies - Optional explicit cookies to use instead of session
 */
async function uploadMediaWeb(session, fileBuffer, fileName, mimeType, mediaType, explicitCookies = null) {
  const formData = new FormData();
  formData.append('farr', fileBuffer, {
    filename: fileName,
    contentType: mimeType,
  });

  const cookies = explicitCookies || getCookiesFromSession(session);
  const csrfToken = cookies.csrftoken || (session?.state?.cookieCsrfToken) || '';
  const lsd = generateLsd();
  
  const queryParams = buildWebUploadQueryParams(csrfToken, lsd);
  const url = `https://www.instagram.com/ajax/mercury/upload.php?${queryParams}`;
  
  const cookieString = buildCookieString(cookies);

  const headers = {
    'accept': '*/*',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'sec-ch-prefers-color-scheme': 'dark',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-asbd-id': '359341',
    'x-fb-lsd': lsd,
    'Referer': 'https://www.instagram.com/',
    'Cookie': cookieString,
    ...formData.getHeaders(),
  };

  try {
    console.log(`[uploadMediaWeb] Uploading ${mediaType}: ${fileName} (${fileBuffer.length} bytes)`);
    console.log(`[uploadMediaWeb] URL: ${url.substring(0, 100)}...`);
    
    const response = await axios({
      method: 'POST',
      url,
      headers,
      data: formData,
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log(`[uploadMediaWeb] Response status: ${response.status}`);
    console.log(`[uploadMediaWeb] Response data type: ${typeof response.data}`);
    
    return parseWebUploadResponse(response.data, mediaType);
  } catch (err) {
    console.error(`[uploadMediaWeb] Error:`, err.message);
    if (err.response) {
      console.error(`[uploadMediaWeb] Response status:`, err.response.status);
      console.error(`[uploadMediaWeb] Response data:`, typeof err.response.data === 'string' 
        ? err.response.data.substring(0, 500) 
        : JSON.stringify(err.response.data).substring(0, 500));
    }
    throw new Error(`uploadMediaWeb: Upload failed — ${err.message || 'Unknown error'}`);
  }
}

/**
 * Extract cookies from session's cookieJar
 */
function getCookiesFromSession(session) {
  const cookies = {};
  
  try {
    if (session.state && session.state.cookieJar) {
      const jar = session.state.cookieJar;
      const host = 'https://www.instagram.com';
      
      let cookieList = [];
      if (typeof jar.getCookiesSync === 'function') {
        cookieList = jar.getCookiesSync(host);
      }
      
      if (Array.isArray(cookieList)) {
        for (const c of cookieList) {
          cookies[c.key] = c.value;
        }
      }
    }
    
    if (session.state) {
      if (session.state.cookieCsrfToken && !cookies.csrftoken) {
        cookies.csrftoken = session.state.cookieCsrfToken;
      }
      if (session.state.cookieUserId && !cookies.ds_user_id) {
        cookies.ds_user_id = session.state.cookieUserId;
      }
    }
  } catch (e) {
    console.error('[getCookiesFromSession] Error:', e.message);
  }
  
  return cookies;
}

/**
 * Build cookie string for headers
 */
function buildCookieString(cookies) {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

/**
 * Generate LSD token (similar to what Instagram web uses)
 */
function generateLsd() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 22; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Build query parameters for web upload
 */
function buildWebUploadQueryParams(csrfToken, lsd) {
  const params = new URLSearchParams({
    '__d': 'www',
    '__user': '0',
    '__a': '1',
    '__req': 'a',
    'dpr': '1',
    '__ccg': 'GOOD',
    '__comet_req': '7',
    'lsd': lsd,
  });
  
  return params.toString();
}

/**
 * Parse web upload response (removes "for (;;);" prefix)
 */
function parseWebUploadResponse(data, mediaType) {
  let body = data;
  
  if (typeof body === 'string') {
    if (body.startsWith('for (;;);')) {
      body = body.substring(9);
    }
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.error('[parseWebUploadResponse] Parse error:', e.message);
      console.error('[parseWebUploadResponse] Raw data:', body.substring(0, 500));
      throw new Error(`Failed to parse response: ${body.substring(0, 200)}`);
    }
  }
  
  console.log('[parseWebUploadResponse] Parsed body:', JSON.stringify(body, null, 2).substring(0, 1000));
  
  if (body && body.payload && body.payload.metadata) {
    const metadata = body.payload.metadata['0'] || body.payload.metadata;
    
    if (mediaType === 'video') {
      return {
        success: true,
        video_id: metadata.video_id,
        thumbnail_src: metadata.thumbnail_src,
        filename: metadata.filename,
        filetype: metadata.filetype,
        raw: body,
      };
    } else if (mediaType === 'audio') {
      return {
        success: true,
        audio_id: metadata.audio_id,
        filename: metadata.filename,
        filetype: metadata.filetype,
        raw: body,
      };
    }
  }
  
  return {
    success: false,
    raw: body,
    error: 'Unexpected response structure',
  };
}

module.exports = {
  uploadVideoWeb,
  uploadAudioWeb,
  uploadMediaWeb,
  getCookiesFromSession,
  generateLsd,
  buildWebUploadQueryParams,
  parseWebUploadResponse,
};
