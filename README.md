# IGNIS.AI - Forest Fire Risk Telemetry Dashboard

IGNIS.AI is an advanced, full-stack predictive dashboard designed to monitor and assess forest fire risks globally. It integrates live weather telemetry, real-time alerts, and a 3D Digital Twin visualization, powered by an AI prediction service.

## 🌟 Key Features

- **Global Alerts Center**: Real-time notifications for CRITICAL and HIGH fire risks.
- **GIS Command Center**: Interactive 2D mapping (Leaflet) and an advanced 3D Digital Twin (React Three Fiber) with procedural topography and dynamic fire/smoke particle effects.
- **AI Risk Prediction**: Powered by a standalone Python FastAPI microservice that utilizes state-of-the-art conversational AI models (Pollinations/Hugging Face) for context-aware risk analysis.
- **Live Telemetry & Weather**: Simulates or fetches live telemetry (Temperature, Humidity, Wind Speed, etc.) to assess environmental danger.

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: TailwindCSS, Lucide-React
- **Mapping & 3D**: `react-leaflet`, `@react-three/fiber`, `@react-three/drei`, `three.js`
- **Charts**: `recharts`

### Backend
- **Server**: Node.js + Express
- **Realtime**: Socket.IO for live telemetry streaming
- **Database & Auth**: Supabase SDK (Replaced Prisma)
- **AI Service**: Python + FastAPI + Uvicorn

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.9+
- Supabase Account / CLI

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/soumya2600/ignis.git
   cd ignis
   ```

2. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   ```

3. **Setup Backend**
   ```bash
   cd ../backend
   npm install
   # Create a .env file with your SUPABASE_URL and SUPABASE_SERVICE_KEY
   ```

4. **Setup AI Service**
   ```bash
   cd ai
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   pip install fastapi uvicorn requests
   ```

### Running the Project (Dev Mode)

You will need three terminal windows:

1. **Frontend**: `cd frontend && npm run dev`
2. **Backend**: `cd backend && npm run dev`
3. **AI Service**: `cd backend/ai && uvicorn main:app --reload`

## 📦 Database Schema

The database relies on Supabase. Execute `backend/database.sql` directly into your Supabase SQL Editor to initialize all necessary tables (`forest_regions`, `alerts`, `fire_hotspots`, etc.).

## 🔒 Environment Variables

Ensure `.env` files are created in both the `backend` and `backend/ai` directories. Do not commit `.env` files to source control!

## 📜 License
MIT License
