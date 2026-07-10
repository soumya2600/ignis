import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Popup, Circle, useMap } from 'react-leaflet';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { ShieldAlert, Wind, ThermometerSun, Droplets, Map as MapIcon, Box, ArrowRight, Activity, AlertTriangle, Info, Globe2, Sun, Waves, Sprout, Download, FlaskConical } from 'lucide-react';
import Map, { Marker as MaplibreMarker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { io } from 'socket.io-client';
import FireAnimation from './components/FireAnimation';

const socket = io('http://172.22.2.126:5000');

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
    { text: "Hello! I am AGNIDRISHTI. How can I assist you with fire risk analysis today?", sender: "ai" }
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
      const response = await fetch('http://172.22.2.126:5000/api/predictions/chat', {
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
              <span className="font-semibold text-sm">AGNIDRISHTI Assistant (Live)</span>
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



// --- Dashboard Component ---
const Dashboard = ({ onBack }: { onBack: () => void }) => {
  const [mode, setMode] = useState<'2d' | '3d'>('3d');
  const [tab, setTab] = useState<'map' | 'analytics' | 'alerts' | 'xai' | 'sandbox'>('map');
  const [focusLocation, setFocusLocation] = useState<string>('Similipal Forest, India');
  
  const [globalData, setGlobalData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const [sandboxData, setSandboxData] = useState({
    temperature: 35.0,
    humidity: 20.0,
    rainfall: 0.0,
    wind_speed: 25.0,
    wind_direction: "NW",
    ndvi: 0.3,
    elevation: 500.0,
    soil_moisture: 30.0,
    solar_radiation: 800.0,
    drought_index: 8.0,
    location_name: "Test Region"
  });
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const handlePredict = async () => {
    setIsPredicting(true);
    try {
      const response = await fetch('http://172.22.2.126:5000/api/predictions/predict-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sandboxData)
      });
      const data = await response.json();
      setSandboxResult(data);
    } catch (err) {
      console.error(err);
    }
    setIsPredicting(false);
  };


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

  let shapData: any[] = [];
  if (livePrediction?.feature_importance) {
    const imp = livePrediction.feature_importance;
    shapData = [
      { feature: 'Temperature', impact: imp.temperature || 0, fill: '#F59E0B' },
      { feature: 'Wind Speed', impact: imp.wind_speed || 0, fill: '#EF4444' },
      { feature: 'Humidity', impact: imp.humidity || 0, fill: '#3B82F6' },
      { feature: 'NDVI', impact: imp.ndvi || 0, fill: '#10B981' }
    ].sort((a, b) => b.impact - a.impact);
  }

  const handleGenerateReport = async () => {
    const doc = new jsPDF();
    
    // Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text("AGNIDRISHTI", 14, 22);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(239, 68, 68); // ff-danger
    doc.text("Advanced Forest Fire Intelligence Report", 14, 32);
    
    // Sub-header Info
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 50);
    doc.text(`Target Region: ${focusLocation}`, 14, 56);
    
    let yPos = 65;

    // Telemetry Table
    if (liveTelemetry) {
      autoTable(doc, {
        startY: yPos,
        head: [['Sensor Metric', 'Live Reading', 'Status']],
        body: [
          ['Temperature', `${liveTelemetry.temperature.toFixed(1)} C`, liveTelemetry.temperature > 35 ? 'HIGH' : 'NORMAL'],
          ['Humidity', `${liveTelemetry.humidity.toFixed(1)}%`, liveTelemetry.humidity < 30 ? 'CRITICAL (DRY)' : 'NORMAL'],
          ['Wind Speed', `${liveTelemetry.wind_speed.toFixed(1)} km/h`, liveTelemetry.wind_speed > 25 ? 'HIGH' : 'NORMAL'],
        ],
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] },
        margin: { left: 14 }
      });
      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // AI Insight Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("AI Risk Assessment", 14, yPos);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    yPos += 8;
    const aiText = `Current AI Risk Score: ${livePrediction?.risk_score?.toFixed(1) || '--'}% (${livePrediction?.risk_category || 'UNKNOWN'}). ` + 
                   `This assessment is primarily driven by ${livePrediction?.reasons?.join(' and ') || 'unknown factors'}. ` +
                   `The system recommends ${livePrediction?.risk_category === 'CRITICAL' ? 'immediate deployment of preventive units.' : 'maintaining standard observation protocols.'}`;
    
    const splitText = doc.splitTextToSize(aiText, 180);
    doc.text(splitText, 14, yPos);
    yPos += splitText.length * 6 + 10;

    // Global Hazards Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Global Hazards Pipeline", 14, yPos);
    
    if (alerts.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("No critical anomalies detected globally.", 14, yPos + 8);
    } else {
      const hazardBody = alerts.map((a: any) => [
        a.location,
        a.risk,
        a.time,
        a.message
      ]);
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Location', 'Risk Level', 'Detected', 'AI Diagnosis']],
        body: hazardBody,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] }, // blue-500
        columnStyles: { 3: { cellWidth: 80 } },
        margin: { left: 14 }
      });
    }

    // Page 2: Charts
    try {
      const chartEl = document.getElementById('pdf-hidden-charts');
      if (chartEl) {
        chartEl.style.display = 'block';
        const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#0B1120' });
        chartEl.style.display = 'none';
        
        const imgData = canvas.toDataURL('image/png');
        doc.addPage();
        
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("AI Telemetry & Feature Importance", 14, 16);
        
        doc.addImage(imgData, 'PNG', 14, 35, 182, (canvas.height * 182) / canvas.width);
      }
    } catch (err) {
      console.error('Failed to attach charts to PDF', err);
    }

    // Add footer to all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`AGNIDRISHTI Confidential Report - Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`AGNIDRISHTI_Report_${focusLocation.split(',')[0].replace(/[^a-z0-9]/gi, '_')}.pdf`);
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
            <span className="font-display font-bold text-lg tracking-wide">AGNIDRISHTI<span className="text-ff-primary">.AI</span></span>
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
          <div onClick={() => setTab('sandbox')} className={`p-3 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2 transition-all ${tab === 'sandbox' ? 'bg-ff-primary/10 text-ff-primary border border-ff-primary/20 shadow-[0_0_10px_#2563EB33]' : 'text-gray-400 hover:bg-white/5'}`}>
             <FlaskConical size={16} /> Data Sandbox
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
               {tab === 'map' ? 'Live Telemetry' : tab === 'xai' ? 'Explainable AI' : tab === 'sandbox' ? 'Data Sandbox' : tab}
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
        <div className="flex-1 relative overflow-hidden bg-ff-bg">
          
          {/* TAB: MAP */}
          {tab === 'map' && (
            <div className="w-full h-full flex flex-col overflow-y-auto">
              <div className="w-full flex shrink-0" style={{ height: '70vh' }}>
               <div className="flex-1 relative">
                 {mode === '2d' ? (
                   <MapContainer center={[liveTelemetry?.lat || 0, liveTelemetry?.lng || 0]} zoom={9} zoomControl={false} style={{ height: '100%', width: '100%', background: '#04100C' }}>
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
                   <div className="absolute inset-0 bg-black">
                     <Map
                        initialViewState={{
                          longitude: liveTelemetry?.lng || 86.44,
                          latitude: liveTelemetry?.lat || 21.93,
                          zoom: 12,
                          pitch: 65,
                          bearing: 0
                        }}
                        mapStyle={{
                          version: 8,
                          sources: {
                            'satellite-tiles': {
                              type: 'raster',
                              tiles: [
                                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                              ],
                              tileSize: 256,
                              attribution: 'Esri'
                            },
                            'terrain-source': {
                              type: 'raster-dem',
                              tiles: [
                                'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
                              ],
                              encoding: 'terrarium',
                              tileSize: 256,
                              maxzoom: 14
                            }
                          },
                          layers: [
                            {
                              id: 'satellite-layer',
                              type: 'raster',
                              source: 'satellite-tiles',
                              minzoom: 0,
                              maxzoom: 22
                            }
                          ],
                          terrain: {
                            source: 'terrain-source',
                            exaggeration: 1.5
                          }
                        }}
                      >
                        <NavigationControl position="bottom-right" visualizePitch={true} />
                        
                        {alerts.map((alert: any, idx: number) => {
                           const isCritical = alert.risk === 'CRITICAL';
                           const color = isCritical ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.8)';
                           return (
                             <MaplibreMarker key={idx} longitude={alert.lng} latitude={alert.lat} anchor="bottom">
                                <div className="relative flex items-center justify-center cursor-pointer group">
                                  <div className="absolute w-24 h-24 rounded-full animate-ping" style={{ backgroundColor: color, opacity: 0.4 }}></div>
                                  <div className="relative w-8 h-8 rounded-full border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.8)] flex items-center justify-center" style={{ backgroundColor: isCritical ? '#DC2626' : '#D97706' }}>
                                     <AlertTriangle className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-white/20 backdrop-blur">
                                    {alert.location} ({alert.risk})
                                  </div>
                                </div>
                             </MaplibreMarker>
                           );
                        })}
                      </Map>
                      
                      <div className="absolute top-6 left-6 pointer-events-none z-10">
                        <div className="glass-panel px-6 py-4 rounded-xl border-ff-primary/50 text-ff-primary shadow-[0_0_30px_rgba(37,99,235,0.2)] backdrop-blur-xl bg-black/40 pointer-events-auto">
                          <h3 className="font-bold text-lg mb-1 text-white flex items-center gap-2">
                             <ShieldAlert className="text-ff-danger w-5 h-5" /> 3D Satellite Terrain ({focusLocation})
                          </h3>
                          <p className="text-xs text-gray-300 max-w-[250px] leading-relaxed">
                             High-fidelity GIS elevation mapping enabled. Powered by MapLibre GL.
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
                  <div className="bg-black/40 border border-ff-primary/30 p-3 rounded-xl flex flex-col gap-3">
                     <p className="text-xs text-gray-300 leading-relaxed">
                        Right now, our artificial intelligence is continuously scanning the environment across <strong>{focusLocation.split(',')[0]}</strong>. Based on the latest real-time weather data, the system calculates a <strong>{livePrediction?.risk_score?.toFixed(1) || '--'}%</strong> risk of a forest fire occurring.
                     </p>
                     
                     <p className="text-xs text-gray-300 leading-relaxed">
                        This assessment is driven primarily by <strong>{(livePrediction?.reasons || []).join(' and ')}</strong>. When these specific weather patterns combine, the landscape can dry out quickly, making it highly vulnerable to rapid fire spread.
                     </p>
                     
                     <p className="text-xs text-gray-300 leading-relaxed">
                        Our model is highly confident in this prediction, having cross-referenced today's live conditions against thousands of historical fire incidents. We recommend {livePrediction?.risk_category === 'CRITICAL' || livePrediction?.risk_category === 'HIGH' ? <strong className="text-ff-warning">deploying preventive response units to the area immediately.</strong> : 'maintaining standard observation protocols.'}
                     </p>
                     
                     <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-ff-primary animate-pulse w-full"></div>
                     </div>
                  </div>

                  <button onClick={handleGenerateReport} className="mt-auto glass-button w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                     Generate Live PDF Report
                  </button>
               </div>
              </div>
              
              {/* NEW SECTIONS for scrolling */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-b from-ff-bg to-ff-card">
                
                {/* Section 1: Deep Learning Environmental Matrix */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                   <h3 className="font-bold text-gray-300 mb-2 flex items-center gap-2">
                     <Box size={18} className="text-ff-primary" /> Advanced Deep Learning Matrix
                   </h3>
                   <p className="text-xs text-gray-400 mb-2">Live secondary metrics factored into the AI predictive model.</p>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-colors">
                         <Waves className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" size={24} />
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Soil Moisture</span>
                         <span className="text-xl font-bold mt-1 text-white">{liveTelemetry?.soil_moisture?.toFixed(1) || '--'}%</span>
                      </div>
                      
                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-colors">
                         <Sun className="text-ff-warning mb-2 group-hover:scale-110 transition-transform" size={24} />
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Solar Rad</span>
                         <span className="text-xl font-bold mt-1 text-white">{liveTelemetry?.solar_radiation?.toFixed(0) || '--'} W/m²</span>
                      </div>
                      
                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-colors">
                         <Sprout className="text-ff-success mb-2 group-hover:scale-110 transition-transform" size={24} />
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Drought Idx</span>
                         <span className="text-xl font-bold mt-1 text-white">{liveTelemetry?.drought_index?.toFixed(1) || '--'}</span>
                      </div>
                   </div>
                </div>

                {/* Section 2: Historical AI Trends */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                   <h3 className="font-bold text-gray-300 mb-2 flex items-center gap-2">
                     <Activity size={18} className="text-ff-danger" /> Historical Risk Vector
                   </h3>
                   <p className="text-xs text-gray-400 mb-2">Macro analysis of risk scores across recent time steps.</p>
                   
                   <div className="h-32 w-full mt-auto">
                     {history.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={history}>
                            <XAxis dataKey="time" hide />
                            <YAxis domain={[0, 100]} hide />
                            <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#1E293B', borderRadius: '8px' }} />
                            <Line type="monotone" dataKey="risk" stroke="#EF4444" strokeWidth={3} dot={false} animationDuration={300} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">Waiting for telemetry...</div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ANALYTICS & WEATHER */}
          {tab === 'analytics' && (
            <div className="p-8 h-full overflow-y-auto bg-gradient-to-br from-ff-bg to-ff-card">
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
            <div className="p-8 h-full overflow-y-auto bg-gradient-to-br from-ff-bg to-ff-card">
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


          {/* TAB: SANDBOX */}
          {tab === 'sandbox' && (
            <div className="p-8 h-full overflow-y-auto bg-gradient-to-br from-ff-bg to-ff-card text-white">
               <h2 className="text-3xl font-display font-bold mb-2">AI Data Sandbox</h2>
               <p className="text-gray-400 mb-8 max-w-2xl">Manually tweak environmental variables to test how the AI predicts fire risk under different hypothetical scenarios.</p>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                     <h3 className="font-bold text-gray-300 flex items-center gap-2"><FlaskConical size={18} className="text-ff-primary"/> Input Parameters</h3>
                     <div className="grid grid-cols-2 gap-4">
                        {Object.entries(sandboxData).map(([key, value]) => {
                           if (key === 'wind_direction' || key === 'location_name') return null;
                           return (
                             <div key={key} className="flex flex-col gap-1">
                               <label className="text-xs text-gray-400 capitalize">{key.replace('_', ' ')}</label>
                               <input 
                                 type="number" 
                                 value={value as number}
                                 onChange={(e) => setSandboxData({...sandboxData, [key]: parseFloat(e.target.value) || 0})}
                                 className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-ff-primary"
                               />
                             </div>
                           )
                        })}
                     </div>
                     <button onClick={handlePredict} disabled={isPredicting} className="mt-4 w-full glass-button py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                        {isPredicting ? 'Running Prediction...' : 'Test Risk'}
                     </button>
                  </div>
                  
                  <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
                     <h3 className="font-bold text-gray-300 flex items-center gap-2"><Activity size={18} className="text-ff-warning"/> AI Result</h3>
                     {sandboxResult ? (
                       <div className="flex flex-col gap-4 animate-in fade-in">
                         <div className="bg-black/30 border border-white/10 p-4 rounded-xl flex flex-col gap-1">
                            <div className="text-xs text-gray-400">Predicted Risk Score</div>
                            <div className={`text-3xl font-bold ${sandboxResult.risk_category === 'CRITICAL' ? 'text-ff-danger' : sandboxResult.risk_category === 'HIGH' ? 'text-ff-warning' : 'text-ff-success'}`}>
                               {sandboxResult.risk_score}% ({sandboxResult.risk_category})
                            </div>
                         </div>
                         <div className="bg-black/30 border border-white/10 p-4 rounded-xl flex flex-col gap-1">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Model Reasoning:</div>
                            <ul className="text-sm text-gray-300 flex flex-col gap-2">
                               {sandboxResult.reasons ? sandboxResult.reasons.map((reason: string, i: number) => (
                                 <li key={i} className="flex items-start gap-2"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-ff-primary shrink-0"></div> {reason}</li>
                               )) : (
                                 <li className="text-ff-danger">Error: Could not retrieve AI reasoning.</li>
                               )}
                            </ul>
                         </div>
                       </div>
                     ) : (
                       <div className="flex-1 flex items-center justify-center text-gray-500 text-sm h-48 border border-dashed border-white/10 rounded-xl">
                          Run a prediction to see results here.
                       </div>
                     )}
                  </div>
               </div>
            </div>
          )}

          {/* TAB: XAI EXPLAINABILITY */}
          {tab === 'xai' && (
            <div className="p-8 h-full overflow-y-auto bg-gradient-to-br from-ff-bg to-ff-card">
               <h2 className="text-3xl font-display font-bold mb-2">Live Model Explainability ({focusLocation})</h2>
               <p className="text-gray-400 mb-8 max-w-2xl">Breaking down exactly how the AI arrived at its risk score based on the local weather and environmental conditions.</p>
               
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
      
      {/* Hidden container for capturing PDF Charts */}
      <div id="pdf-hidden-charts" style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '800px', background: '#0B1120', padding: '20px', display: 'none' }}>
         <h2 style={{ color: 'white', marginBottom: '20px', fontFamily: 'sans-serif' }}>Live Risk Engine (Last 15 Mins)</h2>
         <div style={{ width: '760px', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={[0, 100]} />
                <Line type="stepAfter" dataKey="risk" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
         </div>
         <h2 style={{ color: 'white', marginTop: '40px', marginBottom: '20px', fontFamily: 'sans-serif' }}>AI Feature Importance (SHAP)</h2>
         <div style={{ width: '760px', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1E293B" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="feature" type="category" stroke="#94A3B8" width={100} />
                <Bar dataKey="impact" isAnimationActive={false}>
                   {shapData.map((entry: any, index: number) => (
                     <Cell key={`cell-${index}`} fill={entry.fill} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      <Chatbot shapContext={shapData} focusLocation={focusLocation} />
    </div>
  );
};

function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>('landing');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (view === 'dashboard') return <Dashboard onBack={() => setView('landing')} />;

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-ff-bg z-0" />
      <FireAnimation />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-ff-primary-glow/10 blur-[100px] z-0 animate-pulse-slow" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-ff-fire/15 blur-[120px] z-0 animate-pulse-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-ff-warning/10 blur-[100px] z-0 animate-pulse-slow" style={{ animationDelay: '1s' }} />

      <nav className="z-10 w-full px-8 py-6 flex justify-between items-center glass-panel border-x-0 border-t-0 rounded-none shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ff-danger to-ff-warning flex items-center justify-center shadow-[0_0_20px_#EF444488]">
             <ShieldAlert className="text-white w-6 h-6" />
          </div>
          <span className="font-display font-bold text-2xl tracking-wide text-white">AGNIDRISHTI<span className="text-ff-primary">.AI</span></span>
        </div>
        <div className="flex gap-4">
          <button className="glass-button px-6 py-2 rounded-full text-sm font-medium text-white" onClick={() => setView('dashboard')}>Enter Live Command Center</button>
        </div>
      </nav>

      <main className="z-10 flex-grow flex flex-col items-center justify-center px-4 text-center">
        <div className="inline-block mb-6 px-5 py-2 rounded-full glass-panel border-ff-primary/30 text-ff-primary text-xs font-bold tracking-[0.2em] uppercase">
          Global Monitoring System Active
        </div>
        <h1 className="text-5xl md:text-7xl font-bold max-w-4xl leading-tight mb-6 animate-float">
          AI Powered <span className="text-gradient drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">Forest Fire</span> Intelligence System
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 font-light">
          Currently analyzing real-time weather and environmental data across global forests.
        </p>
        <button 
          onClick={() => setView('dashboard')}
          className="glass-button px-8 py-4 rounded-full font-bold text-white flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        >
          Launch Global Dashboard
          <ArrowRight className="w-5 h-5" />
        </button>
      </main>

      {/* PWA Install Button */}
      <button 
        onClick={() => {
          if (deferredPrompt) {
            handleInstallClick();
          } else {
            alert("Your browser currently doesn't support the automatic install prompt, or you've already installed the app. Look for the install icon in your browser's address bar!");
          }
        }}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-emerald-800 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-110 transition-transform cursor-pointer border border-white/40"
        title="Download App"
      >
        <Download className="w-6 h-6 text-white drop-shadow-md" />
      </button>
    </div>
  );
}

export default App;
