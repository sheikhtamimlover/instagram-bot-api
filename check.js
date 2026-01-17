const { IgApiClient, RealtimeClient } = require('./dist/index');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendPhoto, sendFile } = require('./dist/sendmedia');



const USERNAME = process.env.IG_USERNAME || '';
const PASSWORD = process.env.IG_PASSWORD || '';
const EMAIL = process.env.IG_EMAIL || '';

//FILLUP WHICH YOU WANT TO TEST
const TEST_THREAD_ID = '';//YOUR THREAD ID
const RESPONSE_IMAGE_URL = '';//YOUR IMAGE URL
const VIDEO_FILE_PATH = '';//YOUR VIDEO PATH
const AUDIO_FILE_PATH = '';//YOUR AUDIO PATH

async function downloadImage(url) {
  console.log(`Downloading image from: ${url}`);
  const response = await axios.get(url, { 
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  console.log(`Image downloaded, size: ${response.data.length} bytes`);
  return Buffer.from(response.data);
}

async function loginWithCookies(ig) {
  console.log('Attempting cookie-based authentication...');
  try {
    const browserCookies = loadBrowserCookies(COOKIE_PATH);
    validateCookies(browserCookies);
    console.log(`Loaded ${browserCookies.length} cookies from browser export`);
    
    await applyCookiesToClient(ig, browserCookies);
    
    console.log('Validating session with Instagram...');
    const validation = await validateCookieSession(ig);
    
    if (!validation.valid) {
      console.log('Session validation failed:', validation.error);
      console.log('Cookies may be expired. Please export fresh cookies from browser.');
      return false;
    }
    
    console.log(`Cookie auth successful! Username: @${validation.username}, User ID: ${validation.userId}`);
    
    const sessionFile = path.join(__dirname, '.session');
    try {
      const session = await ig.saveSession();
      fs.writeFileSync(sessionFile, JSON.stringify(session));
      console.log('Session saved for future use');
    } catch (e) {}
    
    return true;
  } catch (e) {
    console.log('Cookie auth failed:', e.message);
    return false;
  }
}

async function main() {
  console.log('\n Instagram DM Bot - Direct Media Test\n');
  console.log('Auth Mode:', USE_COOKIE_AUTH ? 'Cookie' : 'Password');
  console.log('Thread ID:', TEST_THREAD_ID);
  console.log('\n');

  const ig = new IgApiClient();

  try {
    let authenticated = false;
    
    if (USE_COOKIE_AUTH && fs.existsSync(COOKIE_PATH)) {
      authenticated = await loginWithCookies(ig);
    }
    
    if (!authenticated) {
      const sessionFile = path.join(__dirname, '.session');
      if (fs.existsSync(sessionFile)) {
        console.log('Loading saved session...');
        try {
          const session = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
          await ig.loadSession(session);
          console.log('Session loaded\n');
          authenticated = true;
        } catch (e) {
          console.log('Session failed:', e.message);
        }
      }
      
      if (!authenticated && USERNAME && PASSWORD) {
        console.log('Logging in with credentials...');
        await ig.login({ username: USERNAME, password: PASSWORD, email: EMAIL });
        const session = await ig.saveSession();
        fs.writeFileSync(sessionFile, JSON.stringify(session));
        console.log('Logged in\n');
        authenticated = true;
      }
      
      if (!authenticated) {
        throw new Error('No valid authentication method available. Please provide cookies in cookie.json or set IG_USERNAME/IG_PASSWORD environment variables.');
      }
    }

    console.log('Authentication successful!\n');
    console.log('=== Starting Direct Media Test ===\n');

    console.log('1. Sending photo...');
    try {
      const photoBuffer = await downloadImage(RESPONSE_IMAGE_URL);
      const photoResult = await sendPhoto(ig, {
        photoBuffer: photoBuffer,
        mimeType: 'image/jpeg',
        threadId: TEST_THREAD_ID,
      });
      console.log('Photo result:', JSON.stringify(photoResult?.body, null, 2));
      console.log('Photo sent!\n');
    } catch (e) {
      console.log('Photo error:', e.message, '\n');
    }

    console.log('2. Sending video...');
    if (fs.existsSync(VIDEO_FILE_PATH)) {
      try {
        const videoBuffer = fs.readFileSync(VIDEO_FILE_PATH);
        console.log(`Video size: ${videoBuffer.length} bytes (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
        const videoResult = await sendFile(ig, {
          fileBuffer: videoBuffer,
          mimeType: 'video/mp4',
          threadId: TEST_THREAD_ID,
        });
        console.log('Video result:', JSON.stringify(videoResult?.body, null, 2));
        console.log('Video sent!\n');
      } catch (e) {
        console.log('Video error:', e.message, '\n');
      }
    } else {
      console.log('Video file not found at:', VIDEO_FILE_PATH, '\n');
    }

    console.log('3. Sending audio...');
    if (fs.existsSync(AUDIO_FILE_PATH)) {
      try {
        const audioBuffer = fs.readFileSync(AUDIO_FILE_PATH);
        console.log(`Audio size: ${audioBuffer.length} bytes (${(audioBuffer.length / 1024).toFixed(2)} KB)`);
        const audioResult = await sendFile(ig, {
          fileBuffer: audioBuffer,
          mimeType: 'audio/mpeg',
          threadId: TEST_THREAD_ID,
        });
        console.log('Audio result:', JSON.stringify(audioResult?.body, null, 2));
        console.log('Audio sent!\n');
      } catch (e) {
        console.log('Audio error:', e.message, '\n');
      }
    } else {
      console.log('Audio file not found at:', AUDIO_FILE_PATH, '\n');
    }

    console.log('=== Test Complete ===\n');
    process.exit(0);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
