# Land Scanner - Admin Panel (TypeScript + Vue.js)

Professional admin panel built with Vue 3, TypeScript, and Vite.

## Features

- ✅ Vue 3 with Composition API
- ✅ TypeScript for type safety
- ✅ Pinia for state management
- ✅ Vue Router for navigation
- ✅ Firebase Firestore integration
- ✅ Axios for backend API calls
- ✅ Responsive design

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your backend URL:
```
VITE_BACKEND_URL=http://localhost:8000
```

### 3. Run Development Server

```bash
npm run dev
```

Opens at: http://localhost:3000

## Build for Production

```bash
npm run build
```

## Deploy to Firebase Hosting

```bash
npm run deploy
```

Or manually:
```bash
npm run build
firebase deploy --only hosting
```

## Project Structure

```
admin-panel/
├── src/
│   ├── components/         # Vue components
│   │   └── Header.vue
│   ├── views/              # Page views
│   │   ├── Dashboard.vue   # Create zones & stats
│   │   ├── Zones.vue       # Manage zones
│   │   ├── Tasks.vue       # View tasks
│   │   └── Analytics.vue   # Analytics (coming soon)
│   ├── stores/             # Pinia stores
│   │   ├── zone.ts         # Zone management
│   │   └── task.ts         # Task management
│   ├── config/
│   │   └── firebase.ts     # Firebase config
│   ├── router/
│   │   └── index.ts        # Vue Router
│   ├── App.vue             # Root component
│   ├── main.ts             # Entry point
│   └── style.css           # Global styles
├── public/                 # Static files
├── index.html              # HTML template
├── vite.config.ts          # Vite config
├── tsconfig.json           # TypeScript config
├── firebase.json           # Firebase hosting config
└── package.json            # Dependencies
```

## Architecture

### Data Flow

```
Admin Panel (Vue.js)
    ↓
1. Create zone → Firebase Firestore
2. Trigger collection → Backend API (POST /api/v1/collect-images)
    ↓
Backend (Python FastAPI)
    ↓
3. Collect from NASA GIBS
4. Upload to ImageKit
5. Write to Supabase (analytics)
6. Write to Firebase (real-time)
    ↓
7. Admin Panel receives results → Display
```

### State Management (Pinia)

- **Zone Store** - Manage zones, trigger collection
- **Task Store** - View tasks and results

### Firebase Integration

- **Firestore Collections:**
  - `zones` - Zone definitions
  - `tasks` - Image collection tasks
  - `users` - User data
  - `tiers` - Subscription tiers

## API Integration

### Backend Endpoints

```typescript
// Create zone and collect images
POST /api/v1/collect-images
{
  zone_id: string
  zone_name: string
  coordinates: { latitude, longitude, altitude }
  zone_area: { size_feet: number }
  quality: 'low' | 'medium' | 'high' | 'ultra'
  user_id: string
  tier_id: string
}

Response:
{
  task_id: string
  zone_id: string
  images: ImageResult[]
  status: 'success' | 'failed'
  message: string
}
```

## Development

### Add New Page

1. Create view in `src/views/NewPage.vue`
2. Add route in `src/router/index.ts`
3. Add navigation link in `src/components/Header.vue`

### Add New Store

```typescript
// src/stores/mystore.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMyStore = defineStore('mystore', () => {
  const data = ref([])
  
  async function loadData() {
    // Load data
  }
  
  return { data, loadData }
})
```

## Production URL

After deployment:
```
https://land-scanner-tamil-developers.web.app
```

Update backend URL in production:
```
VITE_BACKEND_URL=https://your-backend.railway.app
```

## Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Pinia** - State management
- **Vue Router** - Routing
- **Firebase** - Backend services
- **Axios** - HTTP client

## License

Proprietary
