# 🚀 Quick Deployment Guide for Client Testing

This guide will help you deploy the GPS Navigation Admin Panel so your client can test it.

## ✅ Option 1: Railway (Easiest - Recommended)

**Time:** ~10 minutes  
**Cost:** Free tier available

### Steps:

1. **Sign up at [railway.app](https://railway.app)** (use GitHub login)

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository (or push this code to GitHub first)

3. **Configure Deployment:**
   - Railway will auto-detect Node.js
   - Set **Start Command:** `npm start`
   - Set **Build Command:** `npm run build`

4. **Add Environment Variables:**
   - Go to your project → Variables tab
   - Add: `VITE_MAPBOX_TOKEN` = `your_mapbox_token_here`
   - Add: `NODE_ENV` = `production`

5. **Deploy:**
   - Railway will automatically deploy
   - Copy the generated URL (e.g., `https://your-app.railway.app`)
   - Share this URL with your client!

✅ **Done!** Your client can now access the app at the Railway URL.

---

## ✅ Option 2: Render (Free Tier)

**Time:** ~10 minutes  
**Cost:** Free tier available

1. **Sign up at [render.com](https://render.com)**

2. **Create New Web Service:**
   - Connect GitHub repository
   - Build Command: `npm run build`
   - Start Command: `npm start`

3. **Environment Variables:**
   - `VITE_MAPBOX_TOKEN` = your token
   - `NODE_ENV` = `production`

4. **Deploy & Share URL!**

---

## ✅ Option 3: Quick Test with ngrok (Local Development)

For **immediate testing** without deployment:

1. **Start your local server:**
   ```bash
   npm run dev
   ```

2. **Install ngrok:**
   - Download from [ngrok.com](https://ngrok.com/download) (free)
   - Or install via npm: `npm install -g ngrok`

3. **Create tunnel:**
   ```bash
   ngrok http 3001
   ```

4. **Share the ngrok URL** (e.g., `https://abc123.ngrok.io`) with your client

⚠️ **Note:** This URL changes each time you restart ngrok. Use for quick testing only.

---

## 📋 Pre-Deployment Checklist

Before deploying, make sure:

- ✅ Mapbox token is set in environment variables
- ✅ All code is pushed to GitHub (for Railway/Render)
- ✅ `npm run build` works locally (test it first!)

---

## 🔧 Testing After Deployment

Once deployed, test:

1. **Open the deployed URL**
2. **Map loads correctly** (check for Mapbox token)
3. **Create a test street** (draw on map, name it)
4. **Edit a street** (change name/length)
5. **Delete a street** (confirm deletion works)

---

## 📞 Need Help?

- **Railway Issues:** Check [Railway Docs](https://docs.railway.app)
- **Render Issues:** Check [Render Docs](https://render.com/docs)
- **Mapbox Token:** Get from [account.mapbox.com](https://account.mapbox.com/access-tokens/)

---

## 🎯 Recommended: Railway

**Why Railway?**
- ✅ Easiest setup
- ✅ Auto-deploys on git push
- ✅ Free tier available
- ✅ Great for testing/prototypes
- ✅ Easy to upgrade later

**Quick Command (if using Railway CLI):**
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

That's it! 🎉

