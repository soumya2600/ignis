import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import { ShieldAlert, Wind, ThermometerSun, Droplets, Map as MapIcon, Box, ArrowRight, Play, CloudLightning, Activity, AlertTriangle, Info, Globe2 } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Stars, Sparkles, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import jsPDF from 'jspdf';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

// Component to dynamically change Map center when focus changes
const MapUpdater = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 9, { animate: true });
  }, [lat, lng, map]);
  return null;
};

// --- Chatbot Component ---
const Chatbot = ({ shapContext, focusLocation }: { shapContext: any, focusLocation: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello! I am IGNIS.AI. How can I assist you with fire risk analysis today?", sender: "ai" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { text: userMsg, sender: "user" }]);
    setInput("");
    
    let contextStr = "No active anomaly.";
    if (shapContext && shapContext.length > 0) {
       const top = [...shapContext].sort((a, b) => b.impact - a.impact)[0];
       contextStr = `Primary risk driver is ${top.feature}.`;
    }

    try {
      const response = await fetch('http://localhost:5000/api/predictions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          location: focusLocation,
          context: contextStr
        })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { text: data.reply || data.message || "I'm having trouble analyzing right now.", sender: "ai" }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { text: `Error connecting to AI service: ${err.message}`, sender: "ai" }]);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="glass-panel w-80 h-96 rounded-2xl mb-4 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
          <div className="bg-ff-primary/20 p-4 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-ff-success animate-pulse"></div>
              <span className="font-semibold text-sm">IGNIS Assistant (Live)</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div key={i} className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.sender === 'ai' ? 'bg-white/5 border border-white/10 self-start text-gray-200' : 'bg-ff-primary/50 border border-ff-primary self-end text-white'}`}>
                {msg.text}
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t border-white/10 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about live risks..."
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-ff-primary"
            />
            <button onClick={handleSend} className="glass-button px-3 py-2 rounded-lg flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-ff-primary to-blue-400 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-110 transition-transform cursor-pointer border border-white/20"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
      </button>
    </div>
  );
};

const AnimatedTerrain = ({ windSpeed }: { windSpeed: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useEffect(() => {
    if (meshRef.current) {
      const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
      const positions = geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        // Generate complex hilly terrain
        positions[i + 2] = Math.sin(x * 0.1) * 3.0 + Math.cos(y * 0.15) * 2.0 + Math.sin((x+y)*0.05)*1.5;
      }
      geometry.computeVertexNormals();
      geometry.attributes.position.needsUpdate = true;
    }
  }, []);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
      <planeGeometry args={[100, 100, 100, 100]} />
      <meshStandardMaterial color="#064e3b" roughness={0.9} flatShading />
    </mesh>
  );
};

const Forest = () => {
  // Generate random tree positions based on the terrain height
  const trees = React.useMemo(() => {
    return Array.from({ length: 400 }).map(() => {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      const pY = -z;
      const height = Math.sin(x * 0.1) * 3.0 + Math.cos(pY * 0.15) * 2.0 + Math.sin((x+pY)*0.05)*1.5 - 2; 
      const scale = 0.5 + Math.random() * 0.5;
      return { x, y: height, z, scale };
    });
  }, []);

  return (
    <Instances range={400} castShadow receiveShadow>
      <coneGeometry args={[0.4, 2.5, 5]} />
      <meshStandardMaterial color="#022c22" roughness={1} flatShading />
      {trees.map((t, i) => (
        <Instance key={i} position={[t.x, t.y + 1.25, t.z]} scale={t.scale} />
      ))}
    </Instances>
  );
};

const FireHotspot = ({ riskCategory }: { riskCategory: string }) => {
  const isCritical = riskCategory === 'CRITICAL';
  const isHigh = riskCategory === 'HIGH';
  if (!isCritical && !isHigh) return null;
  
  const color = isCritical ? "#EF4444" : "#F59E0B";
  const intensity = isCritical ? 40 : 20;
  
  return (
    <group position={[0, -1, 0]}>
       {/* Fire Particles */}
       <Sparkles count={isCritical ? 300 : 100} scale={15} size={isCritical ? 10 : 6} speed={isCritical ? 0.8 : 0.4} opacity={0.8} color={color} position={[0, 4, 0]} />
       
       {/* Smoke Particles */}
       <Sparkles count={150} scale={15} size={15} speed={0.2} opacity={0.2} color="#555555" position={[0, 8, 0]} />

       {/* Localized Glow */}
       <pointLight position={[0, 3, 0]} distance={50} intensity={intensity} color={color} />
       
       {/* Glowing Core */}
       <mesh position={[0, 0, 0]}>
         <sphereGeometry args={[isCritical ? 2.5 : 1.5, 16, 16]} />
         <meshBasicMaterial color={color} transparent opacity={0.7} />
       </mesh>
    </group>
  );
};


// --- Dashboard Component ---
const Dashboard = ({ onBack }: { onBack: () => void }) => {
  const [mode, setMode] = useState<'2d' | '3d'>('3d');
  const [tab, setTab] = useState<'map' | 'analytics' | 'alerts' | 'xai'>('map');
  const [focusLocation, setFocusLocation] = useState<string>('Similipal Forest, India');
  
  const [globalData, setGlobalData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('live_telemetry_update', (data) => {
      if (data.forests) setGlobalData(data.forests);
      if (data.alerts) setAlerts(data.alerts);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('live_telemetry_update');
    };
  }, []);

  const activeForestData = globalData ? globalData[focusLocation] : null;
  const liveTelemetry = activeForestData?.telemetry;
  const livePrediction = activeForestData?.prediction;
  const history = activeForestData?.history || [];

  let shapData = [];
  if (livePrediction?.feature_importance) {
    const imp = livePrediction.feature_importance;
    shapData = [
      { feature: 'Temperature', impact: imp.temperature || 0, fill: '#F59E0B' },
      { feature: 'Wind Speed', impact: imp.wind_speed || 0, fill: '#EF4444' },
      { feature: 'Humidity', impact: imp.humidity || 0, fill: '#3B82F6' },
      { feature: 'NDVI', impact: imp.ndvi || 0, fill: '#10B981' }
    ].sort((a, b) => b.impact - a.impact);
  }

  const handleGenerateReport = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(239, 68, 68);
    doc.text(`IGNIS.AI - Report: ${focusLocation}`, 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    let yPos = 45;
    if (liveTelemetry) {
      doc.setFont("helvetica", "bold");
      doc.text("Live Sensor Telemetry:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`- Temperature: ${liveTelemetry.temperature.toFixed(1)} C`, 20, yPos + 10);
      doc.text(`- Humidity: ${liveTelemetry.humidity.toFixed(1)}%`, 20, yPos + 18);
      doc.text(`- Wind Speed: ${liveTelemetry.wind_speed.toFixed(1)} km/h`, 20, yPos + 26);
      yPos += 45;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Global Hazards (Live Connection):", 20, yPos);
    yPos += 10;
    if (alerts.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.text("No active hazards globally.", 20, yPos);
    } else {
      alerts.forEach((alert, i) => {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}. Location: ${alert.location} [${alert.risk} Risk]`, 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(alert.message, 25, yPos + 6);
        yPos += 16;
      });
    }

    doc.save(`IGNIS-${focusLocation.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  const jumpToLocation = (locName: string) => {
     setFocusLocation(locName);
     setTab('map');
  };

  return (
    <div className="h-screen w-full flex bg-ff-bg relative overflow-hidden text-white">
      {/* Sidebar */}
      <div className="w-64 glass-panel border-y-0 border-l-0 h-full flex flex-col p-6 z-20 shrink-0">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-ff-danger to-ff-warning flex items-center justify-center shadow-[0_0_15px_#EF444455]">
               <ShieldAlert size={14} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-wide">IGNIS<span className="text-ff-primary">.AI</span></span>
          </div>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-ff-success animate-pulse' : 'bg-ff-danger'}`} title={isConnected ? 'Connected to AI Stream' : 'Disconnected'}></div>
        </div>
        
        <div className="flex-1 flex flex-col gap-3">
          <div onClick={() => setTab('map')} className={`p-3 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2 transition-all ${tab === 'map' ? 'bg-ff-primary/10 text-ff-primary border border-ff-primary/20 shadow-[0_0_10px_#2563EB33]' : 'text-gray-400 hover:bg-white/5'}`}>
             <MapIcon size={16} /> GIS Command Center
          </div>
          <div onClick={() => setTab('analytics')} className={`p-3 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2 transition-all ${tab === 'analytics' ? 'bg-ff-primary/10 text-ff-primary border border-ff-primary/20 shadow-[0_0_10px_#2563EB33]' : 'text-gray-400 hover:bg-white/5'}`}>
             <Activity size={16} /> Analytics & Weather
          </div>
          <div onClick={() => setTab('alerts')} className={`p-3 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2 transition-all ${tab === 'alerts' ? 'bg-ff-primary/10 text-ff-primary border border-ff-primary/20 shadow-[0_0_10px_#2563EB33]' : 'text-gray-400 hover:bg-white/5'}`}>
             <AlertTriangle size={16} /> Global Alerts Center
          </div>
          <div onClick={() => setTab('xai')} className={`p-3 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2 transition-all ${tab === 'xai' ? 'bg-ff-primary/10 text-ff-primary border border-ff-primary/20 shadow-[0_0_10px_#2563EB33]' : 'text-gray-400 hover:bg-white/5'}`}>
             <Box size={16} /> XAI Explainability
          </div>
        </div>
        
        <button onClick={onBack} className="mt-auto text-sm text-gray-500 hover:text-white flex items-center gap-2 transition-colors">
          ← Back to Landing
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Top Navbar */}
        <div className="h-16 glass-panel border-x-0 border-t-0 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
             <h2 className="font-bold text-xl text-gray-100 capitalize">
               {tab === 'map' ? 'Live Telemetry' : tab === 'xai' ? 'Explainable AI' : tab}
             </h2>
             <div className="glass-panel px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 text-ff-primary border-ff-primary/30 ml-4 animate-in fade-in">
               <Globe2 size={14} /> Focus: {focusLocation}
             </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`border px-3 py-1.5 rounded-full text-xs font-bold animate-pulse flex items-center gap-2 ${alerts.length > 0 ? 'bg-ff-danger/20 text-ff-danger border-ff-danger/30' : 'bg-ff-success/20 text-ff-success border-ff-success/30'}`}>
              <div className={`w-2 h-2 rounded-full ${alerts.length > 0 ? 'bg-ff-danger' : 'bg-ff-success'}`}></div>
              {alerts.length > 0 ? `${alerts.length} Global Hazards` : 'System Nominal'}
            </div>
            
            {/* 3D / 2D Toggle */}
            {tab === 'map' && (
              <div className="flex bg-black/40 rounded-lg p-1 border border-white/10 z-50">
                <button 
                  onClick={() => setMode('2d')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === '2d' ? 'bg-ff-primary text-white shadow-[0_0_10px_#2563EB55]' : 'text-gray-400 hover:text-white'}`}
                >
                  2D Map
                </button>
                <button 
                  onClick={() => setMode('3d')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === '3d' ? 'bg-ff-primary text-white shadow-[0_0_10px_#2563EB55]' : 'text-gray-400 hover:text-white'}`}
                >
                  3D Digital Twin
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Workspace */}
        <div className="flex-1 relative overflow-hidden bg-[#0B1426]">
          
          {/* TAB: MAP */}
          {tab === 'map' && (
            <div className="w-full h-full flex">
               <div className="flex-1 relative">
                 {mode === '2d' ? (
                   <MapContainer center={[liveTelemetry?.lat || 0, liveTelemetry?.lng || 0]} zoom={9} zoomControl={false} style={{ height: '100%', width: '100%', background: '#0B1426' }}>
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; CARTO'
                      />
                      {liveTelemetry && (
                        <>
                          <MapUpdater lat={liveTelemetry.lat} lng={liveTelemetry.lng} />
                          <Circle center={[liveTelemetry.lat, liveTelemetry.lng]} radius={livePrediction?.risk_score > 60 ? 15000 : 5000} pathOptions={{ color: livePrediction?.risk_score > 80 ? '#EF4444' : '#F59E0B', fillColor: livePrediction?.risk_score > 80 ? '#EF4444' : '#F59E0B', fillOpacity: 0.4 }}>
                            <Popup className="bg-ff-card border-none text-white p-0">
                               <div className="p-2">
                                 <h4 className={`font-bold mb-1 ${livePrediction?.risk_score > 80 ? 'text-ff-danger' : 'text-ff-warning'}`}>{focusLocation}</h4>
                                 <p className="text-xs text-gray-600 mb-2">Confidence: {livePrediction?.confidence?.toFixed(1) || 90}%</p>
                                 <button className="bg-ff-danger text-white text-[10px] px-2 py-1 rounded">Dispatch Units</button>
                               </div>
                            </Popup>
                          </Circle>
                        </>
                      )}
                   </MapContainer>
                 ) : (
                   <div className="absolute inset-0 bg-black cursor-move">
                      <Canvas camera={{ position: [0, 5, 15], fov: 60 }}>
                         <color attach="background" args={['#050811']} />
                         <fog attach="fog" args={['#050811', 10, 40]} />
                         <ambientLight intensity={0.2} />
                         <pointLight position={[10, 10, 10]} intensity={1} color="#2563EB" />
                         <pointLight position={[-10, 5, -10]} intensity={0.5} color="#EF4444" />
                         
                         <AnimatedTerrain windSpeed={liveTelemetry?.wind_speed || 1} />
                         <Forest />
                         <FireHotspot riskCategory={livePrediction?.risk_category} />
                         
                         <Grid infiniteGrid fadeDistance={40} sectionColor="#1E293B" cellColor="#0B1120" />
                         <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
                         
                         <OrbitControls enableDamping dampingFactor={0.05} maxPolarAngle={Math.PI / 2.1} minDistance={2} maxDistance={30} />
                      </Canvas>
                      
                      <div className="absolute top-6 left-6 pointer-events-none z-10">
                        <div className="glass-panel px-6 py-4 rounded-xl border-ff-primary/50 text-ff-primary shadow-[0_0_30px_rgba(37,99,235,0.2)] backdrop-blur-xl bg-black/40 pointer-events-auto">
                          <h3 className="font-bold text-lg mb-1 text-white flex items-center gap-2">
                             <ShieldAlert className="text-ff-danger w-5 h-5" /> 3D Digital Twin ({focusLocation})
                          </h3>
                          <p className="text-xs text-gray-300 max-w-[250px] leading-relaxed">
                             Terrain meshes are affected by live wind speed ({liveTelemetry?.wind_speed?.toFixed(1) || 0} km/h).
                          </p>
                        </div>
                      </div>
                   </div>
                 )}
               </div>
               
               <div className="w-80 glass-panel border-y-0 border-r-0 h-full p-4 flex flex-col gap-4 overflow-y-auto shrink-0 z-10">
                  <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mb-2">Live AI Sensors</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-ff-warning"><ThermometerSun size={14} /> <span className="text-xs font-semibold">Temp</span></div>
                      <div className="text-xl font-bold">{liveTelemetry?.temperature?.toFixed(1) || '--'}°C</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-blue-400"><Droplets size={14} /> <span className="text-xs font-semibold">Humidity</span></div>
                      <div className="text-xl font-bold">{liveTelemetry?.humidity?.toFixed(1) || '--'}%</div>
                    </div>
                    <div className="bg-black/30 border border-white/10 rounded-xl p-3 flex flex-col gap-1 col-span-2">
                      <div className="flex items-center gap-2 text-gray-300"><Wind size={14} /> <span className="text-xs font-semibold">Wind Speed ({liveTelemetry?.wind_direction || 'NW'})</span></div>
                      <div className="text-xl font-bold">{liveTelemetry?.wind_speed?.toFixed(1) || '--'} km/h</div>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mt-4 mb-2">AI Status</h3>
                  <div className="bg-black/30 border border-white/10 p-3 rounded-xl flex flex-col gap-1">
                     <div className="text-xs text-gray-400">Risk Prediction for {focusLocation.split(',')[0]}</div>
                     <div className={`text-2xl font-bold ${livePrediction?.risk_category === 'CRITICAL' ? 'text-ff-danger' : livePrediction?.risk_category === 'HIGH' ? 'text-ff-warning' : 'text-ff-success'}`}>
                        {livePrediction?.risk_score?.toFixed(1) || '--'}% ({livePrediction?.risk_category || 'WAITING'})
                     </div>
                  </div>

                  {/* New AI Analysis Panel */}
                  <h3 className="font-bold text-sm text-gray-400 uppercase tracking-wider mt-4 mb-2 flex items-center gap-2"><Globe2 size={14}/> AI Insight Generation</h3>
                  <div className="bg-black/40 border border-ff-primary/30 p-3 rounded-xl flex flex-col gap-2">
                     <div className="text-xs text-gray-300 leading-relaxed">
                        Hugging Face model analysis indicates {livePrediction?.risk_category === 'CRITICAL' ? 'immediate severe threat' : 'nominal environmental shifts'} driven largely by {(livePrediction?.reasons || []).join(' and ')}.
                     </div>
                     <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-ff-primary animate-pulse w-full"></div>
                     </div>
                  </div>

                  <button onClick={handleGenerateReport} className="mt-auto glass-button w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                     Generate Live PDF Report
                  </button>
               </div>
            </div>
          )}

          {/* TAB: ANALYTICS & WEATHER */}
          {tab === 'analytics' && (
            <div className="p-8 h-full overflow-y-auto bg-gradient-to-br from-[#0B1120] to-[#111827]">
              <h2 className="text-3xl font-display font-bold mb-6">Live AI Pipeline Analytics ({focusLocation})</h2>
              
              <div className="glass-panel p-6 rounded-2xl mb-6">
                 <h3 className="font-bold text-gray-400 mb-4 flex items-center gap-2"><Activity size={18} /> Real-Time Risk Engine Chart</h3>
                 <div className="flex flex-col gap-2 h-64">
                    {history.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={history}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                          <XAxis dataKey="time" stroke="#64748b" />
                          <YAxis stroke="#64748b" domain={[0, 100]} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1E293B', borderRadius: '8px' }} />
                          <Line type="stepAfter" dataKey="risk" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444' }} animationDuration={300} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Awaiting WebSockets Stream...</div>
                    )}
                 </div>
              </div>
            </div>
          )}

          {/* TAB: ALERTS CENTER */}
          {tab === 'alerts' && (
            <div className="p-8 h-full overflow-y-auto bg-gradient-to-br from-[#0B1120] to-[#111827]">
              <div className="flex justify-between items-end mb-6">
                 <div>
                   <h2 className="text-3xl font-display font-bold">Global Alerts Center</h2>
                   <p className="text-gray-400 mt-2">Monitoring anomalies across all connected international forests. Click an alert to focus.</p>
                 </div>
                 <button className="glass-button px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><ShieldAlert size={16} /> Broadcast Emergency SMS</button>
              </div>
              
              <div className="flex flex-col gap-4">
                {alerts.length === 0 ? (
                   <div className="glass-panel p-10 text-center text-gray-400 rounded-xl">No critical anomalies detected globally.</div>
                ) : (
                  alerts.map((alert, i) => (
                    <div key={i} onClick={() => jumpToLocation(alert.location)} className={`glass-panel p-5 rounded-xl border-l-4 ${alert.severity === 'ff-danger' ? 'border-l-ff-danger' : alert.severity === 'ff-warning' ? 'border-l-ff-warning' : 'border-l-ff-success'} flex justify-between items-center group hover:bg-white/10 transition-all cursor-pointer animate-in slide-in-from-top-2`}>
                       <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-3">
                             <h3 className="font-bold text-lg text-white">{alert.location}</h3>
                             <span className={`px-2 py-0.5 rounded text-xs font-bold ${alert.severity === 'ff-danger' ? 'bg-ff-danger/20 text-ff-danger' : alert.severity === 'ff-warning' ? 'bg-ff-warning/20 text-ff-warning' : 'bg-ff-success/20 text-ff-success'}`}>
                               {alert.risk} Risk
                             </span>
                          </div>
                          <p className="text-gray-400 text-sm">{alert.message}</p>
                       </div>
                       <div className="text-right flex flex-col items-end gap-2">
                          <span className="text-xs text-gray-500">{alert.time}</span>
                          <button className="text-xs text-blue-400 hover:text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">Focus Map <ArrowRight size={12} /></button>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: XAI EXPLAINABILITY */}
          {tab === 'xai' && (
            <div className="p-8 h-full overflow-y-auto bg-gradient-to-br from-[#0B1120] to-[#111827]">
               <h2 className="text-3xl font-display font-bold mb-2">Live Model Explainability ({focusLocation})</h2>
               <p className="text-gray-400 mb-8 max-w-2xl">Visualizing SHAP metrics returned by the Hugging Face API for the focused region.</p>
               
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 glass-panel p-6 rounded-2xl">
                    <h3 className="font-bold text-gray-300 mb-6 flex items-center gap-2"><Info size={18} /> Prediction Impact Breakdown</h3>
                    <div className="h-80">
                      {shapData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={shapData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
                            <XAxis type="number" stroke="#64748b" domain={[0, 1]} />
                            <YAxis dataKey="feature" type="category" stroke="#e2e8f0" width={100} tick={{ fontSize: 12 }} />
                            <RechartsTooltip cursor={{fill: '#1E293B'}} contentStyle={{ backgroundColor: '#111827', borderColor: '#1E293B', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="impact" radius={[0, 4, 4, 0]} animationDuration={500}>
                              {shapData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex-1 h-full flex items-center justify-center text-gray-500 text-sm">Waiting for AI SHAP values...</div>
                      )}
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                     <h3 className="font-bold text-ff-danger flex items-center gap-2"><ShieldAlert size={18} /> Model Reasoning</h3>
                     <div className="bg-black/30 p-4 rounded-xl border border-white/5 text-sm text-gray-300 leading-relaxed">
                        The AI engine predicts a <span className={`font-bold ${livePrediction?.risk_category === 'CRITICAL' ? 'text-ff-danger' : 'text-ff-warning'}`}>{livePrediction?.risk_score?.toFixed(1) || '--'}%</span> risk in this sector.
                     </div>
                     <div className="flex flex-col gap-2">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-2">Triggered Rules:</div>
                        <ul className="text-sm text-gray-300 flex flex-col gap-2">
                           {livePrediction?.reasons?.map((reason: string, i: number) => (
                             <li key={i} className="flex items-start gap-2"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-ff-danger shrink-0"></div> {reason}</li>
                           ))}
                           {!livePrediction?.reasons && <li>Waiting for telemetry...</li>}
                        </ul>
                     </div>
                  </div>
               </div>
            </div>
          )}

        </div>
      </div>
      
      <Chatbot shapContext={shapData} focusLocation={focusLocation} />
    </div>
  );
};

function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  if (view === 'dashboard') return <Dashboard onBack={() => setView('landing')} />;

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-ff-bg z-0" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-ff-primary/20 blur-[100px] z-0 animate-pulse" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ff-danger/10 blur-[120px] z-0 animate-[pulse_4s_ease-in-out_infinite]" />
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-ff-warning/10 blur-[100px] z-0" />

      <nav className="z-10 w-full px-8 py-6 flex justify-between items-center glass-panel border-x-0 border-t-0 rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ff-danger to-ff-warning flex items-center justify-center shadow-[0_0_20px_#EF444488]">
             <ShieldAlert className="text-white w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl tracking-wide text-white">IGNIS<span className="text-ff-primary">.AI</span></span>
        </div>
        <div className="flex gap-4">
          <button className="glass-button px-6 py-2 rounded-full text-sm font-medium text-white" onClick={() => setView('dashboard')}>Enter Live Command Center</button>
        </div>
      </nav>

      <main className="z-10 flex-grow flex flex-col items-center justify-center px-4 text-center">
        <div className="inline-block mb-6 px-5 py-2 rounded-full glass-panel border-ff-primary/30 text-ff-primary text-xs font-bold tracking-[0.2em] uppercase">
          Global Monitoring System Active
        </div>
        <h1 className="text-5xl md:text-7xl font-bold max-w-4xl leading-tight mb-6">
          AI Powered <span className="text-gradient drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">Forest Fire</span> Intelligence System
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 font-light">
          Currently polling Hugging Face AI to process telemetry across global forests concurrently.
        </p>
        <button 
          onClick={() => setView('dashboard')}
          className="glass-button px-8 py-4 rounded-full font-bold text-white flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        >
          Launch Global Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>
      </main>
    </div>
  );
}

export default App;
