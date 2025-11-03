# Deployment Guide for GPS Navigation Admin Panel

This guide covers multiple deployment options, from quick testing to production-ready solutions.

## 🚀 Quick Testing Options

### Option 1: Railway (Recommended for Quick Testing)
**Best for:** Quick deployment without much configuration

1. **Sign up at [Railway.app](https://railway.app)**
2. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Initialize Railway project:**
   ```bash
   railway init
   ```

4. **Add environment variables:**
   - In Railway dashboard, go to your project → Variables
   - Add: `VITE_MAPBOX_TOKEN=your_mapbox_token_here`
   - Add: `NODE_ENV=production`

5. **Configure build:**
   Create `railway.json`:
   ```json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "restartPolicyType": "ON_FAILURE",
       "restartPolicyMaxRetries": 10
     }
   }
   ```

6. **Update package.json scripts:**
   ```json
   {
     "scripts": {
       "build": "cd admin-panel && npm run build",
       "start": "node server/index.js",
       "install-all": "npm install && cd admin-panel && npm install"
     }
   }
   ```

7. **Deploy:**
   ```bash
   railway up
   ```

---

### Option 2: Render (Free Tier Available)
**Best for:** Free hosting with easy setup

1. **Sign up at [Render.com](https://render.com)**

2. **Create a Web Service:**
   - Connect your GitHub repository
   - Select "Web Service"
   - Build Command: `npm run install-all && npm run build`
   - Start Command: `npm start`

3. **Environment Variables:**
   - `VITE_MAPBOX_TOKEN=your_token`
   - `NODE_ENV=production`
   - `PORT=3001` (or use Render's auto-assigned port)

4. **Update server/index.js to use PORT env variable:**
   ```javascript
   const PORT = process.env.PORT || 3001;
   ```

---

### Option 3: Vercel (Frontend) + Railway/Render (Backend)
**Best for:** Best performance, separate frontend/backend

#### Backend (Railway/Render):
Follow Option 1 or 2 for backend deployment.

#### Frontend (Vercel):
1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy frontend:**
   ```bash
   cd admin-panel
   vercel
   ```

3. **Update API URLs:**
   Change `http://localhost:3001` to your backend URL in:
   - `admin-panel/src/App.jsx`
   - `admin-panel/src/components/MapEditor.jsx`
   - `admin-panel/src/components/StreetForm.jsx`

---

## 📋 Pre-Deployment Checklist

### 1. Update Server Configuration

Update `server/index.js` to handle production:

```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');
const { init, getDb } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
const db = init();
const { getAllStreets, getStreetById, createStreet, updateStreet, deleteStreet } = getDb();

// API Routes
app.use('/api/streets', require('./routes/streets'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'admin-panel', 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin-panel', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. Update Frontend API URLs

Create `admin-panel/.env.production`:
```env
VITE_MAPBOX_TOKEN=your_token_here
VITE_API_URL=https://your-backend-url.com
```

Then update API calls to use `import.meta.env.VITE_API_URL || 'http://localhost:3001'`

### 3. Update CORS Settings

In `server/index.js`, update CORS to allow your frontend domain:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

### 4. Build Scripts

Update `package.json`:
```json
{
  "scripts": {
    "build": "cd admin-panel && npm install && npm run build",
    "start": "node server/index.js",
    "dev": "concurrently -k \"npm run server\" \"npm run client\"",
    "server": "nodemon server/index.js",
    "client": "cd admin-panel && npm run dev",
    "install-all": "npm install && cd admin-panel && npm install"
  }
}
```

---

## 🐳 Docker Deployment (Advanced)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY admin-panel/package*.json ./admin-panel/

# Install dependencies
RUN npm install
RUN cd admin-panel && npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - VITE_MAPBOX_TOKEN=${VITE_MAPBOX_TOKEN}
      - PORT=3001
    volumes:
      - ./data:/app/data
```

Deploy:
```bash
docker-compose up -d
```

---

## 🔒 Environment Variables Needed

- `VITE_MAPBOX_TOKEN` - Your Mapbox access token
- `NODE_ENV` - Set to `production` for production
- `PORT` - Server port (optional, defaults to 3001)
- `FRONTEND_URL` - Frontend URL for CORS (if separate deployment)

---

## 📝 Quick Test Deployment (ngrok - For Testing Only)

For quick client testing without full deployment:

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   # Or download from ngrok.com
   ```

2. **Start your local server:**
   ```bash
   npm run dev
   ```

3. **Create tunnel:**
   ```bash
   ngrok http 3001
   ```

4. **Share the ngrok URL with client** (e.g., `https://abc123.ngrok.io`)

⚠️ **Note:** This is for testing only. The URL changes each time you restart ngrok.

---

## ✅ Post-Deployment Steps

1. Test all CRUD operations (Create, Read, Update, Delete streets)
2. Verify Mapbox map loads correctly
3. Check that street data persists (JSON file should be created/updated)
4. Test on mobile devices if needed
5. Set up monitoring/logging if using a cloud platform

---

## 🆘 Troubleshooting

### Map not loading:
- Check Mapbox token is set correctly
- Verify CORS settings allow your domain
- Check browser console for errors

### API errors:
- Verify backend URL is correct in frontend
- Check backend logs
- Ensure CORS allows frontend domain

### Database not persisting:
- Check write permissions for `data/` directory
- Verify volume mounts if using Docker

---

## 📞 Support

If you need help with deployment, check:
- Platform-specific documentation (Railway, Render, Vercel)
- Node.js deployment guides
- React/Vite production builds

