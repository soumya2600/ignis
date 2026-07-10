# AGNIDRISHTI: Enterprise Forest Fire Intelligence Platform
## Comprehensive Technical Report

### 1. Executive Summary
AGNIDRISHTI is an advanced, AI-powered forest fire intelligence platform designed to predict, detect, and analyze wildfire risks across the globe. By aggregating real-time weather telemetry, satellite imagery, and historical data, the platform provides actionable insights through Deep Learning, Computer Vision, and Natural Language Processing.

### 2. System Architecture
The platform is built on a highly modular, decoupled architecture:
- **Frontend**: React (TypeScript), TailwindCSS, React-Leaflet, MapLibre GL for high-fidelity 3D terrain rendering, and Recharts for live analytics.
- **Node.js Backend**: Express.js handling WebSocket telemetry streaming, API routing, and external service orchestration (Open-Meteo, Supabase).
- **Python AI Engine**: FastAPI microservice hosting PyTorch Deep Learning models, torchvision CNNs, and Hugging Face Transformers.
- **Database**: Supabase (PostgreSQL) for persistent storage of alerts, historical telemetry, and AI predictions.

### 3. Deep Learning Predictive Engine
The core risk assessment is driven by a custom PyTorch Feed-Forward Neural Network (FFNN).
- **Inputs (11 Features)**: Temperature, Humidity, Rainfall, Wind Speed, Wind Direction, NDVI, Elevation, Soil Moisture, Solar Radiation, Drought Index, and Historical Fire Frequency.
- **Architecture**: A multi-branch sequential model leveraging batch normalization and dropout layers to prevent overfitting.
- **Multi-Task Outputs**: The network outputs a consolidated Risk Score (0-100), Model Confidence (0-100), exact Fire Probability, and an expected Fire Spread Rate vector.
- **Explainable AI (XAI)**: SHAP-based feature importance matrices are calculated per inference to explain exactly which environmental factors are driving the current risk level.

### 4. Computer Vision (Satellite Analysis)
To validate ground telemetry, AGNIDRISHTI incorporates a dedicated Computer Vision pipeline.
- **Model**: Pre-trained ResNet50 (via torchvision).
- **Pipeline**: Raw satellite imagery (Sentinel-2/Landsat) is ingested, normalized, and processed through the CNN.
- **Capabilities**: The model performs multi-label classification to detect Vegetation Health, Burn Scars, Smoke Plumes, and Active Fire Hotspots with high precision.

### 5. Natural Language Processing (NLP)
AGNIDRISHTI moves beyond standard dashboards by integrating an intelligent NLP engine.
- **Model**: Hugging Face Transformers (e.g., Mistral-7B-Instruct).
- **Incident Reports**: Automatically translates numerical risk vectors into structured, professional incident reports in multiple languages (English, Hindi, Odia).
- **Conversational Assistant**: A contextual Chatbot allows operators to ask natural language questions about current hotspots, predicted spread, and preventive measures.

### 6. User Interface & Experience
The frontend was recently overhauled to feature an immersive, enterprise-grade "Forest Theme".
- **Glassmorphism**: Sleek, translucent panels layered over deep evergreen backgrounds (#04100C).
- **3D Digital Twin**: MapLibre GL enables users to view satellite terrain in 3D, mapped with real-time hazard vectors.
- **Dynamic Data Visualization**: Recharts provides macro-analysis of historical risk vectors and live environmental matrices (Soil Moisture, Radiation, Drought Index).
- **Micro-Animations**: Custom particle engines simulate intense forest fires in the background, providing immediate situational awareness.

### 7. Conclusion
AGNIDRISHTI represents the next generation of disaster intelligence. By fusing multi-modal AI inputs (numerical, visual, and textual) into a single, cohesive, and highly responsive dashboard, it provides forest authorities with the tools needed to preemptively combat wildfires before they reach critical mass.
