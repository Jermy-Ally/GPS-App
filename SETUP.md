# Setup Guide

## Quick Start

### Step 1: Install Node.js
Make sure you have Node.js v16 or higher installed. Download from [nodejs.org](https://nodejs.org/)

### Step 2: Get Mapbox Token
1. Go to [Mapbox](https://account.mapbox.com/) and sign up for a free account
2. Navigate to [Access Tokens](https://account.mapbox.com/access-tokens/)
3. Copy your default public token (it starts with `pk.`)

### Step 3: Install Dependencies
Open a terminal in the project root and run:

```bash
npm run install-all
```

### Step 4: Configure Mapbox Token
Create a file named `.env` in the `web-app` folder:

**Windows (PowerShell):**
```powershell
cd web-app
echo "VITE_MAPBOX_TOKEN=your_token_here" > .env
```

**Mac/Linux:**
```bash
cd web-app
echo "VITE_MAPBOX_TOKEN=your_token_here" > .env
```

Replace `your_token_here` with your actual Mapbox token.

### Step 5: Start the Application
From the project root, run:

```bash
npm run dev
```

This starts:
- Backend API server on `http://localhost:3001`
- Web client on `http://localhost:3000`

### Step 6: Open the Web Client
Open your browser and go to: `http://localhost:3000`. The admin console is available under `/admin`.

## Using the Admin Panel

### Drawing a New Street
1. Click "Draw New Street" button (top-left)
2. Click on the map to place points along your street
3. Click "Finish Drawing" when done
4. Enter a street name
5. The street appears in the sidebar

### Editing Street Name or Length
1. Click a street in the sidebar
2. Click "Edit" button
3. Change the name or length
4. Click "Save"

### Editing Street Path
1. Select a street from the sidebar
2. Click "Edit Street Path" on the map
3. Click to adjust points
4. Click "Finish Editing"

### Deleting a Street
1. Select a street in the sidebar
2. Click "Delete" button
3. Confirm deletion

## Troubleshooting

**Map shows "Please set your Mapbox token"**
- Make sure you created the `.env` file in the `web-app` folder
- Check that the token is correct (should start with `pk.`)
- Restart the dev server after creating `.env`

**Streets not saving**
- Check that the backend server is running (port 3001)
- Look at the browser console for errors
- Verify the `data/` folder exists (it's created automatically)

**Port already in use**
- Change the port in `vite.config.js` (web app) or `server/index.js` (backend)
- Or close the application using the port

## Next Steps

After the admin panel is working:
- We'll build the Flutter mobile app
- Add navigation from point A to point B
- Add property numbers feature


