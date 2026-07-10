import re

with open('frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add FlaskConical import
content = content.replace("Sprout, Download }", "Sprout, Download, FlaskConical }")

# 2. Modify tab state
content = content.replace("useState<'map' | 'analytics' | 'alerts' | 'xai'>('map')", "useState<'map' | 'analytics' | 'alerts' | 'xai' | 'sandbox'>('map')")

# 3. Insert sandbox state and handlePredict function
state_injection = """
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
"""
content = content.replace("const [isConnected, setIsConnected] = useState(false);", "const [isConnected, setIsConnected] = useState(false);\n" + state_injection)

# 4. Add Sidebar Button
sidebar_btn = """
          <div onClick={() => setTab('xai')} className={`p-3 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2 transition-all ${tab === 'xai' ? 'bg-ff-primary/10 text-ff-primary border border-ff-primary/20 shadow-[0_0_10px_#2563EB33]' : 'text-gray-400 hover:bg-white/5'}`}>
             <Box size={16} /> XAI Explainability
          </div>
          <div onClick={() => setTab('sandbox')} className={`p-3 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2 transition-all ${tab === 'sandbox' ? 'bg-ff-primary/10 text-ff-primary border border-ff-primary/20 shadow-[0_0_10px_#2563EB33]' : 'text-gray-400 hover:bg-white/5'}`}>
             <FlaskConical size={16} /> Data Sandbox
          </div>
"""
content = content.replace("""          <div onClick={() => setTab('xai')} className={`p-3 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2 transition-all ${tab === 'xai' ? 'bg-ff-primary/10 text-ff-primary border border-ff-primary/20 shadow-[0_0_10px_#2563EB33]' : 'text-gray-400 hover:bg-white/5'}`}>
             <Box size={16} /> XAI Explainability
          </div>""", sidebar_btn)

# 5. Modify Top Navbar title
title_replace = "{tab === 'map' ? 'Live Telemetry' : tab === 'xai' ? 'Explainable AI' : tab === 'sandbox' ? 'Data Sandbox' : tab}"
content = content.replace("{tab === 'map' ? 'Live Telemetry' : tab === 'xai' ? 'Explainable AI' : tab}", title_replace)

# 6. Add Sandbox Tab UI
sandbox_ui = """
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
                        {isPredicting ? 'Running Prediction...' : 'Test AI Model'}
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
                               {sandboxResult.reasons.map((reason: string, i: number) => (
                                 <li key={i} className="flex items-start gap-2"><div className="mt-1 w-1.5 h-1.5 rounded-full bg-ff-primary shrink-0"></div> {reason}</li>
                               ))}
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
"""
content = content.replace("          {/* TAB: XAI EXPLAINABILITY */}", sandbox_ui + "\n          {/* TAB: XAI EXPLAINABILITY */}")

with open('frontend/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Patched App.tsx successfully.")
