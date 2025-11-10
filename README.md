# GPS Navigation App - Web Client

A cross-platform GPS navigation system with custom street data editing capabilities. This project includes a unified web client that serves both end-user pages and the admin console for managing streets, plus a mobile app (coming soon) for navigation.

## Features

- **Interactive Map Editor**: Draw and edit streets directly on the map
- **Street Management**: Add, edit, and delete street names and lengths
- **Custom Street Data**: Store your own street information privately
- **Real-time Updates**: See changes immediately on the map

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Mapbox account (free tier available) - [Sign up here](https://account.mapbox.com/)

## Setup Instructions

### 1. Get a Mapbox Access Token

1. Create a free account at [Mapbox](https://account.mapbox.com/)
2. Go to your [Access Tokens page](https://account.mapbox.com/access-tokens/)
3. Copy your default public token

### 2. Install Dependencies

From the project root, run:

```bash
npm run install-all
```

This will install dependencies for both the server and the web client.

### 3. Configure Environment Variables

Create a `.env` file in the `web-app` directory:

```bash
cd web-app
echo "VITE_MAPBOX_TOKEN=your_mapbox_token_here" > .env
```

Replace `your_mapbox_token_here` with your actual Mapbox token.

### 4. Start the Application

From the project root:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Web client on `http://localhost:3000`

### 5. Access the Web Client

Open your browser and navigate to `http://localhost:3000`. End-user pages are served at the root, and the admin console is available under `/admin`.

## Usage Guide

### Adding a New Street

1. Click the "Draw New Street" button in the top-left of the map
2. Click on the map to place points along your street path
3. Click "Finish Drawing" when you're done
4. Enter a name for the street
5. The street will be saved and appear in the sidebar

### Editing a Street

1. Click on a street in the sidebar or click its label on the map
2. To edit the name or length:
   - Click the "Edit" button next to the street in the sidebar
   - Update the form and click "Save"
3. To edit the street path:
   - Select the street
   - Click "Edit Street Path" button on the map
   - Click to add/remove points, then click "Finish Editing"

### Deleting a Street

1. Select a street from the sidebar
2. Click the "Delete" button
3. Confirm the deletion

## Project Structure

```
GPS App/
├── server/              # Backend API
│   ├── database/       # Database setup and schema
│   ├── routes/         # API routes
│   └── index.js        # Server entry point
├── web-app/            # React web client (public + admin)
│   ├── src/
│   │   ├── components/ # React components
│   │   └── App.jsx     # Main app component
│   └── package.json
├── data/               # SQLite database (created automatically)
└── package.json        # Root package.json
```

## API Endpoints

- `GET /api/streets` - Get all streets
- `GET /api/streets/:id` - Get a specific street
- `POST /api/streets` - Create a new street
- `PUT /api/streets/:id` - Update a street
- `DELETE /api/streets/:id` - Delete a street

## Technology Stack

- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **Frontend**: React, Vite, Mapbox GL JS
- **Database**: SQLite (can be migrated to PostgreSQL for production)

## Next Steps

- Mobile app (Flutter) for end users
- Property numbers feature
- User authentication for admin panel
- Route calculation and navigation

## Troubleshooting

### Map not loading
- Make sure you've set your Mapbox token in the `.env` file
- Check the browser console for errors

### Streets not appearing
- Check that the backend server is running on port 3001
- Verify the database file was created in the `data/` directory

### CORS errors
- Make sure both servers are running
- The admin panel should proxy API requests automatically

## Notes

- The database is stored locally in `data/streets.db`
- Street data is stored as GeoJSON LineString geometry
- Street lengths are automatically calculated based on coordinates
- All coordinates use the standard [longitude, latitude] format

## License

MIT


