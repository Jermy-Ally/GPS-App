# GPS Admin Panel - User Guide

## 🗺️ Why the Map Isn't Showing

The map isn't loading because you need to add your **Mapbox token**. Here's how:

### Step 1: Get Your Free Mapbox Token
1. Go to https://account.mapbox.com/
2. Sign up for a free account (if you don't have one)
3. Go to **Access Tokens** page
4. Copy your **default public token** (it starts with `pk.`)

### Step 2: Create the .env File
1. In the `admin-panel` folder, create a file named `.env`
2. Add this line (replace with your actual token):
   ```
   VITE_MAPBOX_TOKEN=pk.your_actual_token_here
   ```
3. Save the file

### Step 3: Restart the Server
1. Stop the current server (Ctrl+C in the terminal)
2. Run `npm run dev` again
3. Refresh your browser at `http://localhost:3000`

---

## 📝 How to Use the Admin Panel

Once the map loads, here's how everything works:

### **Adding a New Street**

**Method 1: Using the Map Button**
1. Click **"Draw New Street"** button (top-left on the map)
2. Click on the map to place points along your street path
   - Each click adds a point
   - A green dashed line shows your street as you draw
   - Green dots mark each point
3. When finished, click **"Finish Drawing"**
4. Enter a name for the street (e.g., "Main Street")
5. The street is saved and appears in the sidebar

**Method 2: Using Sidebar Button**
1. Click **"+ New Street"** button in the sidebar
2. A form appears in the sidebar
3. Enter the street name and length (optional)
4. Then click **"Draw New Street"** on the map to draw the path

### **Viewing Streets**

- All streets appear in the left sidebar
- Click any street name to select it
- The selected street is highlighted in yellow on the map
- The map automatically zooms to show the selected street

### **Editing Street Name or Length**

1. Click a street in the sidebar to select it
2. Click the **"Edit"** button next to the street
3. The form appears - change the name or length
4. Click **"Save"** to update

### **Editing Street Path (Moving Points)**

1. Select a street from the sidebar
2. Click **"Edit Street Path"** button on the map
3. Click on the map to add new points or adjust the path
4. Click **"Finish Editing"** when done
5. The street path and length are automatically updated

### **Deleting a Street**

1. Select a street from the sidebar
2. Click the **"Delete"** button
3. Confirm the deletion
4. The street is removed from both the map and the database

---

## 🎯 Tips & Tricks

- **Zoom & Pan**: Use mouse wheel to zoom, click and drag to pan the map
- **Street Names**: Street names appear as blue labels on the map
- **Street Length**: Length is automatically calculated from the coordinates
- **Minimum Points**: You need at least 2 points to create a street
- **Cancel Drawing**: Click "Cancel" if you change your mind while drawing

---

## ❓ Troubleshooting

**Map still not showing after adding token?**
- Make sure the `.env` file is in the `admin-panel` folder (not the root)
- Check that the token starts with `pk.`
- Restart the dev server after creating/editing `.env`
- Check browser console (F12) for error messages

**Can't save streets?**
- Make sure the backend server is running on port 3001
- Check browser console for API errors
- Verify you're connected to the internet (for Mapbox tiles)

**Streets not appearing on map?**
- Try refreshing the page
- Check that you clicked "Finish Drawing" after placing points
- Make sure you entered a street name when prompted

---

## 📍 Default Map Location

The map is centered on **Luebo, Democratic Republic of the Congo** by default. You can:
- Pan the map to any location
- Zoom in/out to your preferred area
- Draw streets anywhere in the world

Your custom street data will overlay on top of the Mapbox satellite imagery.

