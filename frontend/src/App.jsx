import { useState, useMemo } from 'react';
import { 
  Upload, Activity, Users, Clock, AlertTriangle, 
  HeartPulse, ShieldAlert, LayoutDashboard, Calendar, 
  FileText, Download, Cpu, Award, Code
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [twistActive, setTwistActive] = useState(false);

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!file) { setError("Please select a CSV file first."); return; }
    setLoading(true); setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('twist', twistActive);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/simulate', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Simulation failed on the server.');
      const data = await response.json();
      setResults(data);
      setActiveTab('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (!results) return;
    const exportData = { treatments: results.treatments, estimated_total_risk: results.estimated_total_risk };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'submission.json';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const stats = useMemo(() => {
    if (!results) return null;
    const treatments = results.treatments;
    const maxTime = Math.max(...treatments.map(t => t.end_time), 1);
    
    let docWorkloads = { 'Doctor_T': 0, 'Doctor_C': 0, 'Doctor_G': 0 };
    let docCounts = { 'Doctor_T': 0, 'Doctor_C': 0, 'Doctor_G': 0 };

    treatments.forEach(t => {
      docWorkloads[t.doctor_id] += (t.end_time - t.start_time);
      docCounts[t.doctor_id] += 1;
    });

    const pieData = [
      { id: 'Doctor_T', name: 'Trauma', value: docCounts['Doctor_T'], color: '#60a5fa', work: docWorkloads['Doctor_T'], bg: 'bg-blue-500/20', border: 'border-blue-400/30', text: 'text-blue-300' },
      { id: 'Doctor_C', name: 'Cardio', value: docCounts['Doctor_C'], color: '#fb7185', work: docWorkloads['Doctor_C'], bg: 'bg-rose-500/20', border: 'border-rose-400/30', text: 'text-rose-300' },
      { id: 'Doctor_G', name: 'General', value: docCounts['Doctor_G'], color: '#34d399', work: docWorkloads['Doctor_G'], bg: 'bg-emerald-500/20', border: 'border-emerald-400/30', text: 'text-emerald-300' }
    ];

    return { maxTime, pieData, strategy: results.winning_strategy || "Balanced Optimizer", doctors: pieData };
  }, [results]);

  // --- PAGE 1: OVERVIEW DASHBOARD ---
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Strategy Banner */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/20 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-white/5 rounded-xl border border-white/5"><Cpu className="w-5 h-5 text-slate-300" /></div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Ensemble Engine Selected</p>
            <p className="text-base font-bold text-white tracking-tight">{stats.strategy}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20 shadow-sm">
          <Award className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-300">Optimal Path Verified</span>
        </div>
      </div>

      {/* Dark Glass KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg shadow-black/20 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-105 transition-transform duration-500"><AlertTriangle className="w-32 h-32 text-rose-500" /></div>
          <div className="flex items-center gap-2 mb-2 relative z-10">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Total System Risk</p>
          </div>
          <p className="text-5xl font-bold tracking-tighter text-white mt-2 relative z-10">{results.estimated_total_risk.toLocaleString()}</p>
        </div>
        
        <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg shadow-black/20 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-105 transition-transform duration-500"><Users className="w-32 h-32 text-blue-500" /></div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Patients Processed</p>
          <p className="text-5xl font-bold tracking-tighter text-white mt-2 relative z-10">{results.treatments.length}</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-lg shadow-black/20 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 p-8 opacity-5 group-hover:scale-105 transition-transform duration-500"><Clock className="w-32 h-32 text-emerald-500" /></div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Sim Duration</p>
          <p className="text-5xl font-bold tracking-tighter text-white mt-2 relative z-10">{stats.maxTime}<span className="text-xl text-slate-500 ml-1 font-medium tracking-normal">m</span></p>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-lg shadow-black/20 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight mb-1">Resource Utilization</h2>
            <p className="text-xs text-slate-400 mb-8">Active treatment volume across designated specializations.</p>
          </div>
          <div className="space-y-6">
            {stats.pieData.map((doc, i) => {
              const utilPercent = ((doc.work / stats.maxTime) * 100).toFixed(0);
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-2 font-medium">
                    <span className="text-slate-300 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: doc.color }}></div>
                      {doc.name} Unit
                    </span>
                    <span className="text-slate-400">{utilPercent}% Active</span>
                  </div>
                  <div className="w-full bg-slate-800/50 rounded-full h-2 border border-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ width: `${utilPercent}%`, backgroundColor: doc.color }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-lg shadow-black/20 flex flex-col h-[320px]">
          <h2 className="text-base font-bold text-white tracking-tight mb-1">Load Distribution</h2>
          <p className="text-xs text-slate-400 mb-2">Aggregate patient routing data.</p>
          <div className="flex-1 -mt-4 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.pieData} innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
                  {stats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                  itemStyle={{ color: '#f8fafc', fontSize: '12px', fontWeight: '600' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  // --- PAGE 2: MASTER SCHEDULE (GANTT) ---
  const renderTimeline = () => (
    <div className="animate-in fade-in duration-500 h-full flex flex-col">
      <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-lg shadow-black/20 flex flex-col flex-1 overflow-hidden">
        <div className="mb-6 shrink-0">
          <h2 className="text-lg font-bold text-white tracking-tight">Master Schedule</h2>
          <p className="text-xs text-slate-400 mt-1">Horizontal layout of the complete triage timeline. Scroll to explore.</p>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
          <div className="relative min-h-[300px] flex flex-col justify-center" style={{ width: `${Math.max(1000, stats.maxTime * (results.treatments.length > 50 ? 4 : 10))}px` }}>
            
            <div className="absolute inset-0 flex justify-between ml-28 pointer-events-none">
              {[...Array(11)].map((_, i) => <div key={i} className="h-full border-l border-white/5 border-dashed"></div>)}
            </div>

            {stats.doctors.map((doc) => {
              const docTreatments = results.treatments.filter(t => t.doctor_id === doc.id);
              return (
                <div key={doc.id} className="h-14 my-2 relative flex items-center bg-slate-800/30 rounded-xl border border-white/5">
                  
                  <div className="sticky left-0 z-20 w-28 bg-slate-900/90 backdrop-blur-md h-full flex items-center justify-end pr-4 border-r border-white/10 shrink-0 rounded-l-xl">
                    <span className="font-semibold text-slate-300 text-[10px] text-right uppercase tracking-widest">{doc.name}</span>
                  </div>
                  
                  <div className="flex-1 h-full relative mx-1">
                    {docTreatments.map((t, i) => {
                      const duration = t.end_time - t.start_time;
                      const left = (t.start_time / stats.maxTime) * 100;
                      const width = (duration / stats.maxTime) * 100;
                      
                      return (
                        <div 
                          key={i}
                          className={`absolute top-1.5 bottom-1.5 ${doc.bg} ${doc.border} ${doc.text} rounded-md border flex flex-col justify-center items-center text-[9px] font-medium transition-all hover:-translate-y-0.5 hover:brightness-125 cursor-crosshair overflow-hidden group`}
                          style={{ left: `${left}%`, width: `${width}%`, minWidth: '4px' }}
                          title={`Patient: ${t.patient_id}\nStart: T+${t.start_time}m | End: T+${t.end_time}m`}
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity truncate px-1">{t.patient_id}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            <div className="relative h-6 border-t border-white/10 mt-4 ml-28">
              {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct, i) => {
                const timeMark = Math.round(stats.maxTime * pct);
                return (
                  <div key={i} className="absolute top-2 text-[9px] font-medium text-slate-500 -translate-x-1/2 flex flex-col items-center" style={{ left: `${pct * 100}%` }}>
                    <div className="w-px h-1.5 bg-slate-600 absolute -top-1.5"></div>{timeMark}m
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- PAGE 3: PATIENT LOGS ---
  const renderPatients = () => (
    <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg shadow-black/20 overflow-hidden animate-in fade-in duration-500 flex flex-col h-[calc(100vh-8rem)]">
      <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Patient Ledger</h2>
          <p className="text-xs text-slate-400 mt-1">Immutable log of scheduling decisions.</p>
        </div>
        <div className="bg-slate-800/80 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 border border-white/5">
          Records: {results.treatments.length}
        </div>
      </div>
      <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/50 text-[10px] uppercase text-slate-400 font-semibold sticky top-0 backdrop-blur-md z-10 rounded-lg">
            <tr>
              <th className="px-6 py-3 tracking-wider rounded-tl-lg">Patient ID</th>
              <th className="px-6 py-3 tracking-wider">Assigned Unit</th>
              <th className="px-6 py-3 tracking-wider text-right">Start (T+)</th>
              <th className="px-6 py-3 tracking-wider text-right">End (T+)</th>
              <th className="px-6 py-3 tracking-wider text-right rounded-tr-lg">Duration</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 text-xs">
            {results.treatments.map((t, i) => {
              const docSpec = stats.doctors.find(d => d.id === t.doctor_id);
              return (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 font-medium text-white">{t.patient_id}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${docSpec.bg} ${docSpec.text} ${docSpec.border}`}>
                      {docSpec.name}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-mono text-right text-slate-400">{t.start_time}</td>
                  <td className="px-6 py-3 font-mono text-right text-slate-400">{t.end_time}</td>
                  <td className="px-6 py-3 font-mono text-right font-medium text-slate-300">{t.end_time - t.start_time}m</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  // --- PAGE 4: RAW JSON EXPORT VIEW ---
  const renderJsonView = () => {
    // Isolate only the required schema keys
    const cleanSubmission = {
      treatments: results.treatments,
      estimated_total_risk: results.estimated_total_risk
    };

    return (
      <div className="bg-slate-900/40 backdrop-blur-xl rounded-3xl border border-white/10 shadow-lg shadow-black/20 overflow-hidden animate-in fade-in duration-500 flex flex-col h-[calc(100vh-8rem)]">
        <div className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">submission.json</h2>
            <p className="text-xs text-slate-400 mt-1">Strict schema compliance view. Ready for verify.py.</p>
          </div>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(cleanSubmission, null, 2));
              alert("Strict JSON schema copied to clipboard!");
            }}
            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
          >
            Copy to Clipboard
          </button>
        </div>
        
        {/* Code Block Container */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-950/50">
          <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap">
            {JSON.stringify(cleanSubmission, null, 2)}
          </pre>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 font-sans overflow-hidden selection:bg-blue-500/30 relative">
      
      {/* Glowing Ambient Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      {/* FROSTED SIDEBAR */}
      <aside className="w-64 m-6 mr-0 bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/50 rounded-3xl flex flex-col relative z-20 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <HeartPulse className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">SmartTriage</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold ${activeTab === 'dashboard' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <LayoutDashboard className="w-4 h-4" /> Overview
          </button>
          <button onClick={() => setActiveTab('timeline')} disabled={!results} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${activeTab === 'timeline' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Calendar className="w-4 h-4" /> Schedule Gantt
          </button>
          <button onClick={() => setActiveTab('patients')} disabled={!results} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${activeTab === 'patients' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <FileText className="w-4 h-4" /> Patient Logs
          </button>
          <button onClick={() => setActiveTab('json')} disabled={!results} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${activeTab === 'json' ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Code className="w-4 h-4" /> Raw JSON
          </button>
        </nav>

        {results && (
          <div className="p-4 border-t border-white/5">
            <button onClick={handleExportJSON} className="w-full flex justify-center items-center gap-2 bg-white hover:bg-slate-200 text-slate-900 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-white/10 active:scale-95">
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* HEADER */}
        <header className="px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-white/5 backdrop-blur-md border border-white/10 shadow-sm hover:bg-white/10 px-4 py-2 rounded-xl transition-all group">
              <Upload className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
              <span className="text-xs font-medium text-slate-300 group-hover:text-white">{file ? file.name : "Select Dataset"}</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
            {error && <span className="text-[10px] font-medium text-rose-400 flex items-center gap-1.5 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20 shadow-sm"><ShieldAlert className="w-3.5 h-3.5"/> {error}</span>}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 cursor-pointer group bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-sm" onClick={() => setTwistActive(!twistActive)}>
              <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Fatigue</span>
              <div className={`w-8 h-4 rounded-full transition-colors duration-300 ${twistActive ? 'bg-blue-600' : 'bg-slate-700'} relative`}>
                <div className={`w-3 h-3 bg-white rounded-full absolute top-[2px] transition-all duration-300 shadow-sm ${twistActive ? 'left-[18px]' : 'left-[2px]'}`}></div>
              </div>
            </div>

            <button 
              onClick={handleUpload}
              disabled={loading || !file}
              className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
            >
              <Activity className={`w-3.5 h-3.5 ${loading && "animate-spin"}`} />
              {loading ? 'Processing...' : 'Run Engine'}
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
          {!results ? (
             <div className="h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
               <div className="w-16 h-16 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 flex items-center justify-center mb-6 relative">
                 <div className="absolute inset-0 bg-blue-500/10 rounded-2xl animate-pulse"></div>
                 <Activity className="w-6 h-6 text-blue-400" />
               </div>
               <h2 className="text-xl font-bold text-white mb-2 tracking-tight">System Standby</h2>
               <p className="text-xs text-slate-400 max-w-sm text-center leading-relaxed">Mount a patient dataset to initialize the scheduling matrix.</p>
             </div>
          ) : (
            <>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'timeline' && renderTimeline()}
              {activeTab === 'patients' && renderPatients()}
              {activeTab === 'json' && renderJsonView()}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;