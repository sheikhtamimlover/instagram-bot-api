# 📸 Instagram Bot API (Professional Edition)

<p align="center">
  <img src="https://img.shields.io/npm/v/instagram-bot-api?style=for-the-badge" alt="NPM Version" />
  <img src="https://img.shields.io/node/v/instagram-bot-api?style=for-the-badge" alt="Node Version" />
  <img src="https://img.shields.io/npm/dt/instagram-bot-api?style=for-the-badge" alt="Downloads" />
  <img src="https://img.shields.io/github/stars/sheikhtamimlover/instagram-bot-api?style=for-the-badge" alt="Stars" />
</p>

---

## 👤 Author & Support
**Sheikh Tamim**
- 📧 **Email:** [tamimsheikh142@gmail.com](mailto:tamimsheikh142@gmail.com)
- 📸 **Instagram:** [@sheikh.tamim_lover](https://www.instagram.com/sheikh.tamim_lover)
- 🔗 **Bot App:** [InstagramBot](https://github.com/sheikhtamimlover/InstagramBot)
- 📚 **Based On:** [nodejs-insta-private-api](https://github.com/Kunboruto20/nodejs-insta-private-api)

---

## 🚀 Key Features

| Feature | Description |
| :--- | :--- |
| ⚡ **Realtime MQTT** | Sub-500ms latency for Direct Messages and Notifications. |
| 🔐 **Multi-File Auth** | Baileys-style session management. No more re-logins! |
| 🛠 **Full Automation** | Follow, Unfollow, Like, Comment, and Story interactions. |
| 📁 **Media Upload** | High-quality Photo, Video, and Album uploads. |
| 📡 **Proxy Support** | Built-in support for HTTP/SOCKS5 proxies. |
| 🤖 **Bot Logic** | Easy-to-use event emitters for building responsive bots. |

---

## 📦 Installation

```bash
npm install instagram-bot-api
```

---

## 💻 Professional Code Examples

### 1️⃣ Advanced Login with Session Persistence
Stop logging in every time. Save your session to a folder and reuse it.

```javascript
const { IgApiClient, useMultiFileAuthState } = require('instagram-bot-api');
const chalk = require('chalk');

async function initialize() {
  const ig = new IgApiClient();
  
  // 1. Setup Auth State (Persistence)
  const { state, saveCreds } = await useMultiFileAuthState('./auth_sessions');
  
  // 2. Device Configuration
  ig.state.generateDevice(process.env.IG_USERNAME);
  
  // 3. Optional: Proxy Setup
  // ig.state.proxyUrl = 'http://user:pass@host:port';

  try {
    console.log(chalk.blue('Logging in...'));
    const user = await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
    console.log(chalk.green(`Logged in as: ${user.username}`));
    
    // Always save creds after successful login
    await saveCreds();
  } catch (e) {
    console.error(chalk.red('Login failed:'), e.message);
  }
}
```

### 2️⃣ Realtime Message Listener
Listen to incoming DMs in real-time using the MQTT protocol.

```javascript
const { RealtimeClient } = require('instagram-bot-api');

async function startRealtime(ig) {
  const realtime = new RealtimeClient(ig);

  realtime.on('message', (payload) => {
    const { message, thread } = payload;
    console.log(`New message in ${thread.thread_id}: ${message.text}`);
    
    // Auto-reply example
    if (message.text.toLowerCase() === 'hi') {
      thread.broadcastText('Hello! This is an automated response.');
    }
  });

  await realtime.connect();
}
```

### 3️⃣ Bulk Messaging / Automation
Safely interact with users using built-in delay helpers.

```javascript
async function automate(ig) {
  const targetUser = 'sheikh.tamim_lover';
  const userId = await ig.user.getIdByUsername(targetUser);
  
  // Follow a user
  await ig.friendship.create(userId);
  
  // Like the latest post
  const feed = ig.feed.user(userId);
  const items = await feed.items();
  if (items.length > 0) {
    await ig.media.like({
      mediaId: items[0].pk,
      moduleInfo: { module_name: 'profile' }
    });
  }
}
```

---

## 🛠 Advanced Features Table

- **Realtime Protocols:** Iris Handshake, Skywalker, and MQTT Integration.
- **Direct Messaging:** 18+ methods including text, media, story sharing, and voice.
- **Account Security:** Native device replication to prevent bans.
- **Feed Management:** Explore, Timeline, User, and Hashtag feeds.

---

## 📞 Get In Touch
Need a custom bot or professional integration? Reach out to **Sheikh Tamim** via Email or Instagram for 24/7 support.

---
*Developed with ❤️ by Sheikh Tamim*
