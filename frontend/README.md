# VIBESETTER OS — Frontend Dashboard

Cyberpunk-inspired, high-performance web dashboard for the VIBESETTER AI Companion Rover.

---

## 🎨 Tech Stack & Libraries
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS with custom neon purple theme
- **Animations**: Framer Motion (page transitions, glowing aura, robot eyes)
- **Icons**: Lucide React
- **Router**: React Router v7
- **Communication**: REST API (Fetch with abort timeouts) + WebSockets (`/ws/status`)

---

## 📁 Directory Structure
```
frontend/
├── src/
│   ├── assets/              # SVG logos & robot visualizers
│   ├── components/          # Reusable glassmorphic UI components
│   │   ├── common/          # GlassCard, CyberButton, StatusBadge, MetricIndicator
│   │   ├── dashboard/       # Rover telemetry, battery, AI companion card
│   │   ├── expressions/     # OLED animated robot eyes preview
│   │   ├── layout/          # Neon Navbar & TabNavigation
│   │   └── voice/           # Microphone wave visualizer & conversation history
│   ├── hooks/               # useRoverTelemetry, useRoverControl, useVoiceRecognition
│   ├── pages/               # Dashboard, Control, Voice AI, Expressions, Music, Settings
│   ├── services/            # apiClient, roverService, systemService, aiService, moodService
│   ├── App.jsx              # Application shell with routed transitions
│   ├── index.css            # Tailwind directives, cyberpunk neon scrollbar & animations
│   └── main.jsx             # React DOM entrypoint
├── public/                  # Favicons & static assets
├── index.html               # HTML5 shell with Orbitron font imports
├── vite.config.js           # Vite build configuration
├── tailwind.config.js       # Cyberpunk theme color palette & border glow utilities
├── package.json             # NPM dependencies & scripts
└── README.md
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default parameters:
```ini
VITE_API_URL=http://127.0.0.1:8000
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_WS_URL=ws://127.0.0.1:8000/ws/status
VITE_USE_MOCK=false
```

### 3. Start Development Server
```bash
npm run dev
```
Open **`http://127.0.0.1:5173`** in your browser.

### 4. Build for Production
```bash
npm run build
```
Build output is generated in `frontend/dist/`.
