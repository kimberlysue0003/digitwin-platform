# Digital Twin Platform - Frontend

3D visualization of Singapore city with real-time environmental data.

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Three.js + @react-three/fiber + @react-three/drei (3D rendering)
- Zustand (state management)
- Tailwind CSS (styling)
- TanStack Query (data fetching, to be added)

## Project Structure

```
src/
├── components/
│   ├── 3d/
│   │   └── CityScene.tsx       # Main 3D scene
│   └── StatusPanel.tsx         # UI overlay
├── hooks/
│   └── useWebSocket.ts         # WebSocket connection
├── stores/
│   └── environmentStore.ts     # Global state
├── services/
│   └── neaApi.ts              # NEA API client
├── types/
│   ├── environment.ts         # Environment data types
│   └── building.ts            # Building data types
└── utils/                     # Utility functions
```

## Development

```bash
npm install
npm run dev
```

## Features Roadmap

- [x] Basic 3D scene setup
- [x] WebSocket connection hook
- [x] Environment data state management
- [ ] Building layer with extrusion
- [ ] Wind particle system
- [ ] Pollution heatmap overlay
- [ ] Temperature visualization
- [ ] UI controls and settings panel

## API Integration

### Direct NEA API (for testing)
The app can connect directly to Singapore NEA APIs without a backend:
- Temperature: Per-minute updates, 12 stations
- Wind: Per-minute updates, 13 stations
- PM2.5/PSI: Hourly updates, 5 regions
- Rainfall: 5-minute updates, 54 stations

### Backend WebSocket (production)
When backend is ready, uncomment WebSocket connection in `App.tsx`.

## Environment Variables

Create `.env.local`:
```
VITE_WS_URL=ws://localhost:3000/ws
VITE_API_URL=http://localhost:3000/api
```
