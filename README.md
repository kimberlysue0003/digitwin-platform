# Singapore Urban Digital Twin Platform

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.180.0-000000?logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.1.14-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![AWS S3](https://img.shields.io/badge/AWS-S3-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com/s3/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.16.3-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)

A real-time 3D/2D visualization platform for Singapore's urban environmental data, featuring interactive maps and immersive 3D scenes.

🌐 **Live Demo**: http://digitwin-platform-frontend.s3-website-ap-southeast-1.amazonaws.com/

---

## Features

### 🗺️ 2D Map View
- **Accurate Geographic Data**: 55 Singapore planning areas with precise GeoJSON boundaries
- **Region-Based Visualization**: Color-coded regions (North, South, East, West, Central)
- **Interactive Selection**: Click any area to view detailed 3D visualization
- **Real-time Data Overlays**: Temperature, wind, air quality, and rainfall

### 🌡️ Temperature Visualization
- Animated pulsing markers with dual-ring effects
- 3km radius gradient overlays for smooth transitions
- Color mapping: Blue (cool) → Green → Yellow → Red (hot)
- Real-time data from weather stations

### 💨 Wind Field Animation
- 5 curved streamlines with Bezier animations
- Flowing particle effects along streamline paths
- Speed-based animation dynamics
- Auto-rotating speed labels (always facing up)
- Three-layer rendering for enhanced visibility

### 🌫️ Air Quality Layer
- Polygon overlays matching all 55 planning areas
- Floating particle effects (density increases with pollution levels)
- Pulsing ring animations
- Support for both Polygon and MultiPolygon geometries
- Click-to-select functionality for all regions
- Color-coded by PM2.5 levels: Green (Good) → Yellow (Moderate) → Orange → Red (Unhealthy)

### 🌧️ Rainfall Monitoring
- Real-time rainfall data visualization
- Station-based measurements

### 🏙️ 3D Scene View
- Interactive 3D city visualization
- Region-based environmental data overlays
- Smooth transitions from 2D to 3D

## Technology Stack

### Frontend
- **React 18.3.1** with TypeScript
- **Vite** - Fast build tool and dev server
- **Leaflet.js** - 2D interactive maps
- **Three.js** - 3D visualization
- **Zustand** - State management
- **TailwindCSS** - Styling

### Data Sources
- Singapore NEA (National Environment Agency) APIs
- Singapore Planning Area GeoJSON data
- Real-time environmental monitoring stations

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/kimberlysue0003/digitwin-platform.git
cd digitwin-platform
```

2. Install dependencies
```bash
cd digitwin-frontend
npm install
```

3. Start development server
```bash
npm run dev
```

4. Open browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
digitwin-platform/
├── digitwin-frontend/
│   ├── public/
│   │   └── data/
│   │       └── MasterPlan2019PlanningAreaBoundaryNoSea.geojson
│   ├── src/
│   │   ├── components/
│   │   │   ├── 2d/
│   │   │   │   ├── MapView.tsx          # 2D Leaflet map
│   │   │   │   └── DataOverlays.tsx     # Environmental data layers
│   │   │   ├── 3d/
│   │   │   │   ├── CityScene.tsx        # 3D scene manager
│   │   │   │   ├── TemperatureLayer.tsx
│   │   │   │   ├── WindLayer.tsx
│   │   │   │   ├── AirQualityLayer.tsx
│   │   │   │   └── RainfallLayer.tsx
│   │   │   ├── ControlPanel.tsx         # Layer controls
│   │   │   ├── StatusPanel.tsx          # System status
│   │   │   └── DataFetcher.tsx          # API integration
│   │   ├── services/
│   │   │   ├── neaApi.ts                # NEA API client
│   │   │   ├── geoDataService.ts        # GeoJSON handling
│   │   │   └── buildingService.ts       # 3D building data
│   │   ├── stores/
│   │   │   └── environmentStore.ts      # Global state
│   │   └── types/
│   │       └── environment.ts           # TypeScript definitions
│   └── package.json
└── README.md
```

## Key Features Implementation

### Polygon & MultiPolygon Support
The platform correctly handles both simple polygons and complex multi-polygon geometries (e.g., Western Islands, Jurong Island).

### Optimized Rendering
- SVG-based animations for better performance
- Proper React hooks to prevent unnecessary re-renders
- Efficient geometry processing

### Interactive Elements
- Clickable regions with popup information
- Hover effects
- Smooth view transitions

### Real-time Updates
- 30-second polling interval for environmental data
- Live data integration from NEA APIs
- Auto-refresh without page reload

## Environment Variables

Create a `.env` file in the `digitwin-frontend` directory (optional):

```env
VITE_NEA_API_KEY=your_api_key_here
```

Note: The platform uses public NEA APIs that don't require authentication for basic features.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Future Enhancements

- [ ] WebSocket integration for real-time data streaming
- [ ] Historical data visualization
- [ ] Advanced analytics dashboard
- [ ] Mobile responsive design improvements
- [ ] Additional environmental parameters (UV index, humidity, etc.)
- [ ] User authentication and personalization

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Singapore National Environment Agency (NEA) for environmental data APIs
- Singapore government for open GeoJSON data
- OpenStreetMap contributors for base map tiles
