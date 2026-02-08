
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, ShieldAlert, FileText, MapPin, Search, Plus, 
  ChevronRight, Zap, LayoutDashboard, Map as MapIcon, 
  Database, ClipboardList, TrendingUp, Users, Cpu, Loader2,
  AlertTriangle, CheckCircle2, Terminal, MessageSquare, ExternalLink, Info, RefreshCw, X, Settings, Bell, ChevronDown, Filter, Calendar, Clock, ArrowUpRight, Globe, Box, BarChart3, Satellite, Navigation, Sun, Moon, LogIn, UserPlus, Mail, Lock, User, LogOut, Wifi, WifiOff, Menu, Code, Layers, Share2, Sparkles, Wand2, ShieldCheck, Key, BarChart, Workflow, Briefcase, Trash2, ChevronLeft, PanelLeftClose, PanelLeftOpen, Upload, File
} from 'lucide-react';
import { HospitalReport, AgentStep, ViewState, AuditLog, MedicalDesert, UserProject } from './types';
import RegionalMap from './components/RegionalMap';
import AgentTrace from './components/AgentTrace';
import LandingPage from './components/LandingPage';
import ReportDetail from './components/ReportDetail';
import AIChatBot from './components/AIChatBot';
import MarkdownRenderer from './components/MarkdownRenderer';
import { CapabilityBarChart, MissionPieChart } from './components/VisualTelemetry';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { runDiscoveryAgent, runParserAgent, runStrategistAgent, runPredictorAgent } from './services/geminiService';

const INITIAL_MOCK_AUDIT: AuditLog[] = [
  { id: '1', timestamp: '10:45 AM', event: 'System Node Initialized', user: 'Kernel', status: 'info' },
  { id: '2', timestamp: '11:12 AM', event: 'RSA Identity Protocol Loaded', user: 'Auth_Agent', status: 'success' },
];

const App: React.FC = () => {
  const [hasLaunched, setHasLaunched] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('theme') as any) || 'dark');
  const [reports, setReports] = useState<HospitalReport[]>([]);
  const [deserts, setDeserts] = useState<MedicalDesert[]>([]);
  const [viewState, setViewState] = useState<ViewState>('workspace');
  const [isThinking, setIsThinking] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [plan, setPlan] = useState<string | null>(null);
  const [groundingLinks, setGroundingLinks] = useState<any[]>([]);
  
  // Sidebar State - Disappears/Hidden by default after login as requested
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [selectedReport, setSelectedReport] = useState<HospitalReport | null>(null);

  // User & Project Persistence Database (localStorage implementation)
  const [user, setUser] = useState<any>(() => JSON.parse(localStorage.getItem('vip_user') || 'null'));
  const [registeredUsers, setRegisteredUsers] = useState<any[]>(() => JSON.parse(localStorage.getItem('registered_users') || '[]'));
  
  // UI State
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isGetStartedOpen, setIsGetStartedOpen] = useState(false);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [newNodeData, setNewNodeData] = useState({ facilityName: '', region: '', unstructuredText: '' });
  const [newProjectData, setNewProjectData] = useState({ name: '', files: [] as File[] });
  const [activeProject, setActiveProject] = useState<UserProject | null>(null);
  
  const [kbSearch, setKbSearch] = useState('');
  const [kbFilterRegion, setKbFilterRegion] = useState('All');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_MOCK_AUDIT);
  const [auditFilter, setAuditFilter] = useState<'all' | 'success' | 'warning' | 'info'>('all');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const mainScrollRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Persistence Engine: Sync main user database
  useEffect(() => {
    localStorage.setItem('registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // Persistence Engine: Sync active session and merge back to database
  useEffect(() => {
    if (user) {
      localStorage.setItem('vip_user', JSON.stringify(user));
      setRegisteredUsers(prev => {
        const exists = prev.find(u => u.email === user.email);
        if (exists) {
          return prev.map(u => u.email === user.email ? user : u);
        }
        return [...prev, user];
      });
    }
  }, [user]);

  // Theme Engine
  useEffect(() => {
    if (theme === 'light') document.body.classList.add('light');
    else document.body.classList.remove('light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const existing = registeredUsers.find(u => u.email === formData.email && u.password === formData.password);
    if (existing) {
      setUser(existing);
      setIsLoginOpen(false);
      setHasLaunched(true);
      setViewState('workspace');
      setIsSidebarOpen(false); // Ensure hidden on login
      setFormData({ name: '', email: '', password: '' });
    } else {
      setAuthError('Invalid credentials. Identity check failed.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (formData.name.length < 3) return setAuthError('Designation must be at least 3 characters.');
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) return setAuthError('Enter a valid email sequence.');
    if (formData.password.length < 6) return setAuthError('Password must be at least 6 characters.');
    if (registeredUsers.some(u => u.email === formData.email)) {
      return setAuthError('This email sequence is already in the database.');
    }
    const newUser = { ...formData, projects: [] };
    setUser(newUser);
    setIsGetStartedOpen(false);
    setHasLaunched(true);
    setViewState('workspace');
    setIsSidebarOpen(false); // Ensure hidden on login
    setFormData({ name: '', email: '', password: '' });
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('vip_user');
    setHasLaunched(false);
    setViewState('workspace');
    setActiveProject(null);
    setReports([]);
    setShowUserMenu(false);
    setIsSidebarOpen(false); // Disappear sidebar on logout
    setTheme('dark'); // Return theme to dark mode as requested
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectData.name || newProjectData.files.length === 0) return;

    setIsCreateProjectOpen(false);
    setIsThinking(true);
    setViewState('analysis');
    setSteps([]);
    setPlan(null);

    try {
      addStep({ agentName: 'Parser', action: 'Multi-Format Ingestion', status: 'active', description: `Inhaling ${newProjectData.files.length} data streams...` });
      
      const fileContents = await Promise.all(newProjectData.files.map(f => readFileAsText(f)));
      const combinedText = fileContents.filter(t => t.length > 0).join('\n\n--- SOURCE BOUNDARY ---\n\n');

      const parsed = await runParserAgent(combinedText);
      updateLastStep({ status: 'completed', intermediateOutput: parsed });

      addStep({ agentName: 'Verifier', action: 'Global Grounding', status: 'active', description: 'Scraping internet nodes for validation...' });
      const enrichedDiscovery = await runDiscoveryAgent(parsed.facilityName || newProjectData.name);
      
      let finalReports = enrichedDiscovery.data || [];
      if (parsed.facilityName) {
        const matchingFound = finalReports.find(r => r.facilityName.toLowerCase().includes(parsed.facilityName.toLowerCase()));
        if (matchingFound) {
          parsed.coordinates = matchingFound.coordinates;
          parsed.region = matchingFound.region;
        }
        const mainReport: HospitalReport = {
          id: 'main-' + Date.now(),
          facilityName: parsed.facilityName,
          region: parsed.region || 'Unknown',
          reportDate: new Date().toLocaleDateString(),
          unstructuredText: combinedText.slice(0, 1000) + '...',
          coordinates: parsed.coordinates,
          extractedData: parsed
        };
        finalReports = [mainReport, ...finalReports];
      }

      addStep({ agentName: 'Strategist', action: 'Strategic Planning', status: 'active', description: 'Synthesizing tactical roadmap...' });
      const strategistRes = await runStrategistAgent(finalReports);
      updateLastStep({ status: 'completed', metrics: strategistRes.metrics });

      const newProject: UserProject = {
        id: 'p' + Date.now(),
        name: newProjectData.name,
        createdAt: new Date().toLocaleDateString(),
        documents: [combinedText],
        reports: finalReports,
        analysisResult: strategistRes.text
      };

      // Permanent Project Storage
      setUser(prev => ({
        ...prev,
        projects: [...(prev.projects || []), newProject]
      }));

      setPlan(strategistRes.text);
      setActiveProject(newProject);
      setReports(newProject.reports);
      if (enrichedDiscovery.grounding) setGroundingLinks(enrichedDiscovery.grounding);
    } catch (err) {
      console.error(err);
      addStep({ agentName: 'Parser', action: 'Critical Error', status: 'error' });
    } finally {
      setIsThinking(false);
      setNewProjectData({ name: '', files: [] });
    }
  };

  const deleteProject = (projectId: string) => {
    if (!user) return;
    const updatedProjects = user.projects.filter((p: UserProject) => p.id !== projectId);
    setUser({ ...user, projects: updatedProjects });
    if (activeProject?.id === projectId) {
      setActiveProject(null);
      setReports([]);
      setPlan(null);
    }
  };

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !newNodeData.facilityName) return;

    setIsAddNodeOpen(false);
    setIsThinking(true);
    setViewState('simulation');

    try {
      addStep({ agentName: 'Parser', action: 'Manual Ingestion', status: 'active', description: `Processing entry for ${newNodeData.facilityName}...` });
      const parsed = await runParserAgent(newNodeData.unstructuredText);
      
      const newNode: HospitalReport = {
        id: 'manual-' + Date.now(),
        facilityName: parsed.facilityName || newNodeData.facilityName,
        region: newNodeData.region,
        reportDate: new Date().toLocaleDateString(),
        unstructuredText: newNodeData.unstructuredText,
        extractedData: parsed
      };

      const updatedReports = [...reports, newNode];
      setReports(updatedReports);
      
      const updatedProject = {
        ...activeProject,
        reports: [...activeProject.reports, newNode]
      };
      
      setActiveProject(updatedProject);
      setUser(prev => ({
        ...prev,
        projects: prev.projects.map((p: UserProject) => p.id === activeProject.id ? updatedProject : p)
      }));

      updateLastStep({ status: 'completed', intermediateOutput: newNode });
      setNewNodeData({ facilityName: '', region: '', unstructuredText: '' });
    } catch (err) {
      addStep({ agentName: 'Parser', action: 'Critical Error', status: 'error' });
    } finally {
      setIsThinking(false);
    }
  };

  const handleIntervention = (report: HospitalReport) => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      event: `Protocol Deployed: ${report.facilityName}`,
      user: user?.name || 'Operator',
      status: 'success'
    };
    setAuditLogs(prev => [newLog, ...prev]);
    setSelectedReport(null);
    setViewState('audit');
  };

  const selectProject = (project: UserProject) => {
    setActiveProject(project);
    setReports(project.reports);
    setPlan(project.analysisResult || null);
    setViewState('dashboard');
  };

  const addStep = (step: Omit<AgentStep, 'id' | 'timestamp'>) => {
    const newStep = {
      ...step,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString()
    };
    setSteps(prev => [...prev, newStep]);
  };

  const updateLastStep = (updates: Partial<AgentStep>) => {
    setSteps(prev => {
      const newSteps = [...prev];
      if (newSteps.length > 0) {
        newSteps[newSteps.length - 1] = { ...newSteps[newSteps.length - 1], ...updates };
      }
      return newSteps;
    });
  };

  const handleAgenticWorkflow = async () => {
    if (!user) return setIsLoginOpen(true);
    setIsThinking(true);
    setSteps([]);
    setViewState('analysis');

    try {
      addStep({ agentName: 'Parser', action: 'Deep Scrape', status: 'active', description: 'Searching live-web for updates...' });
      const discovery = await runDiscoveryAgent(activeProject?.name || "Global Healthcare");
      if (discovery.data?.length > 0) {
        setReports(prev => [...prev, ...discovery.data]);
        if (discovery.grounding) setGroundingLinks(prev => [...prev, ...discovery.grounding]);
      }
      
      addStep({ agentName: 'Strategist', action: 'Logic Synthesis', status: 'active', description: 'Re-calculating resource horizons...' });
      const strategyResponse = await runStrategistAgent(reports);
      setPlan(strategyResponse.text);
      updateLastStep({ status: 'completed', metrics: strategyResponse.metrics });
    } catch (err) {
      addStep({ agentName: 'Strategist', action: 'Fail', status: 'error' });
    } finally {
      setIsThinking(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = (r.facilityName + ' ' + (r.region || '')).toLowerCase().includes(kbSearch.toLowerCase());
      const matchesRegion = kbFilterRegion === 'All' || r.region === kbFilterRegion;
      return matchesSearch && matchesRegion;
    });
  }, [reports, kbSearch, kbFilterRegion]);

  const filteredAudit = useMemo(() => {
    if (auditFilter === 'all') return auditLogs;
    return auditLogs.filter(log => log.status === auditFilter);
  }, [auditLogs, auditFilter]);

  const NavItem = ({ icon: Icon, label, id, badge, alwaysVisible = false }: { icon: any, label: string, id: ViewState, badge?: string, alwaysVisible?: boolean }) => {
    const isVisible = alwaysVisible || (activeProject !== null);
    if (!isVisible) return null;

    return (
      <button 
        onClick={() => { setViewState(id); setIsSidebarOpen(false); }}
        className={`relative flex items-center gap-4 w-full px-5 py-5 rounded-2xl transition-all duration-300 group overflow-hidden ${
          viewState === id 
            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-lg' 
            : 'text-[var(--text-muted)] hover:bg-[var(--input-bg)] border border-transparent'
        }`}
      >
        {viewState === id && <motion.div layoutId="active-pill" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full" />}
        <Icon className={`w-5 h-5 flex-shrink-0 transition-all ${viewState === id ? 'scale-110 text-emerald-400' : 'group-hover:scale-110'}`} />
        <div className="flex items-center justify-between w-full">
          <span className={`text-xs font-bold tracking-tight truncate transition-all ${viewState === id ? 'translate-x-1 font-extrabold text-emerald-400' : 'group-hover:translate-x-1'}`}>{label}</span>
          {badge && <span className="ml-auto px-2 py-0.5 bg-emerald-500/20 rounded-lg text-[8px] font-black text-emerald-400 border border-emerald-500/20 uppercase tracking-tighter">{badge}</span>}
        </div>
      </button>
    );
  };

  return (
    <LayoutGroup>
      <div className={`flex h-screen overflow-hidden bg-[var(--bg-deep)] text-[var(--text-main)] font-['Plus_Jakarta_Sans'] transition-colors duration-300`}>
        <AnimatePresence>
          {!hasLaunched && (
            <LandingPage 
              onLaunch={() => setHasLaunched(true)} 
              onSignIn={() => { setIsLoginOpen(true); setIsGetStartedOpen(false); setAuthError(null); }} 
              onGetStarted={() => { setIsGetStartedOpen(true); setIsLoginOpen(false); setAuthError(null); }} 
              user={user} 
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {user && hasLaunched && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: isSidebarOpen ? 1 : 0 }} 
                onClick={() => setIsSidebarOpen(false)}
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] ${isSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} 
              />
              <motion.aside 
                layout
                initial={{ x: -320 }}
                animate={{ x: isSidebarOpen ? 0 : -320 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-80 z-[110] border-r border-white/[0.03] p-4 flex flex-col h-full bg-[var(--sidebar-bg)] shadow-4xl"
              >
                <div className="flex items-center gap-4 mb-10 px-2 flex-shrink-0">
                  <motion.div layout whileHover={{ rotate: 180 }} className="relative bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-2xl shadow-emerald-500/30 shadow-xl flex-shrink-0"><Activity className="text-white w-5 h-5" /></motion.div>
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-md font-extrabold tracking-tighter text-[var(--text-main)]">VIP LAYER</h1>
                    <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Intelligence</p>
                  </motion.div>
                  <button onClick={() => setIsSidebarOpen(false)} className="ml-auto p-2 text-slate-500 hover:text-emerald-400 transition-colors"><PanelLeftClose className="w-4 h-4" /></button>
                </div>
                
                <nav className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                  <NavItem icon={Briefcase} label="My Workspace" id="workspace" badge={`${user?.projects?.length || 0}`} alwaysVisible />
                  <NavItem icon={LayoutDashboard} label="Strategic Hub" id="dashboard" />
                  <NavItem icon={MapIcon} label="Regional View" id="map" />
                  <NavItem icon={TrendingUp} label="Agent Reasoning" id="analysis" />
                  <NavItem icon={Database} label="Knowledge Matrix" id="simulation" />
                  <NavItem icon={ClipboardList} label="Audit Protocol" id="audit" />
                </nav>

                <div className="mt-auto pt-6 flex-shrink-0 border-t border-white/5 space-y-4">
                   {activeProject && (
                     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-3 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 mb-4">
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Active Operation</p>
                        <p className="text-[10px] font-bold text-[var(--text-main)] truncate">{activeProject.name}</p>
                     </motion.div>
                   )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col min-w-0 h-full relative bg-[var(--bg-deep)] transition-colors duration-300">
          <header className="sticky top-0 z-30 bg-[var(--header-bg)] backdrop-blur-3xl border-b border-white/[0.03] px-6 lg:px-12 py-6 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
               {user && (
                 <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-white/5 rounded-xl text-[var(--text-main)] hover:bg-white/10 transition-all border border-white/10">
                   <Menu className="w-5 h-5" />
                 </button>
               )}
               <h2 className="text-xl lg:text-2xl font-black tracking-tighter capitalize truncate text-[var(--text-main)]">{viewState.replace('-', ' ')}</h2>
            </div>
            <div className="flex items-center gap-3 lg:gap-6">
               <button onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} className="p-3 bg-white/5 hover:bg-emerald-500/10 border border-white/10 rounded-2xl transition-all shadow-sm">
                 {theme === 'dark' ? <Sun className="w-5 h-5 text-emerald-400" /> : <Moon className="w-5 h-5 text-emerald-500" />}
               </button>
               {user && (
                 <div className="relative" ref={userMenuRef}>
                   <div onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-3 pl-3 lg:pl-6 border-l border-[var(--border-subtle)] cursor-pointer group">
                      <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center text-xs font-bold ring-1 ring-white/10 group-hover:ring-emerald-500/50 transition-all text-white">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-all ${showUserMenu ? 'rotate-180' : ''}`} />
                   </div>
                   <AnimatePresence>{showUserMenu && (
                     <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="absolute top-full right-0 mt-4 w-52 bg-[var(--sidebar-bg)] border border-white/10 rounded-2xl shadow-4xl p-2 z-[1000] backdrop-blur-3xl">
                       <div className="px-4 py-3 border-b border-white/5 mb-1">
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{user.name}</p>
                          <p className="text-[10px] font-medium text-[var(--text-muted)] truncate">{user.email}</p>
                       </div>
                       <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors group"><LogOut className="w-4 h-4" /><span className="text-xs font-black uppercase tracking-widest">Logout Protocol</span></button>
                     </motion.div>
                   )}</AnimatePresence>
                 </div>
               )}
            </div>
          </header>

          <div ref={mainScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-12 min-h-0 pb-48">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              
              {viewState === 'workspace' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-48">
                   <div className="flex flex-col sm:flex-row items-center gap-6 justify-between bg-white/[0.04] dark:bg-white/[0.02] p-10 rounded-[3rem] border border-white/10 shadow-2xl">
                      <div className="max-w-md text-center sm:text-left">
                         <h3 className="text-3xl font-black tracking-tighter text-[var(--text-main)]">Operational Workspace</h3>
                         <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2 leading-relaxed">Agentic ingestion center. Upload documents to synthesize a project.</p>
                      </div>
                      <button onClick={() => setIsCreateProjectOpen(true)} className="flex items-center gap-3 px-10 py-6 bg-emerald-500 text-emerald-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                         <Plus className="w-5 h-5" /> Initialize Unit
                      </button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {(user?.projects || []).map((project: UserProject) => (
                         <motion.div 
                          key={project.id} 
                          whileHover={{ y: -5, scale: 1.02 }}
                          onClick={() => selectProject(project)}
                          className={`glass-card p-10 rounded-[2.5rem] border transition-all group cursor-pointer flex flex-col h-full relative ${activeProject?.id === project.id ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-white/10 hover:border-emerald-500/20 shadow-xl'}`}
                         >
                            <div className="flex items-center justify-between mb-8">
                               <div className={`p-3 rounded-2xl transition-all ${activeProject?.id === project.id ? 'bg-emerald-500 text-emerald-950' : 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-emerald-950'}`}><Briefcase className="w-6 h-6" /></div>
                               <button onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }} className="p-2.5 rounded-xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                            </div>
                            <h4 className="text-2xl font-black mb-1 text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">{project.name}</h4>
                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mb-10">{project.createdAt}</p>
                            <div className="mt-auto pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between">
                               <div className="flex items-center gap-2">
                                  <File className="w-3.5 h-3.5 text-slate-500" />
                                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{project.documents.length} Source(s)</span>
                               </div>
                               <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                                  Live Hub <ChevronRight className="w-4 h-4" />
                               </div>
                            </div>
                         </motion.div>
                      ))}
                      {(user?.projects || []).length === 0 && (
                         <div className="lg:col-span-3 py-48 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-subtle)] rounded-[4rem] opacity-30 text-center">
                            <Box className="w-20 h-20 text-slate-400 mb-8" />
                            <p className="text-lg font-black uppercase tracking-widest text-slate-400">No Active Operation Units. <br/> Initialize a project to begin.</p>
                         </div>
                      )}
                   </div>
                </motion.div>
              )}

              {viewState === 'dashboard' && activeProject && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 lg:space-y-10 pb-48">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                     <div className="glass-card p-10 rounded-[3rem] border-white/10 relative overflow-hidden shadow-2xl min-h-[400px]">
                        <CapabilityBarChart 
                          title="Local Intelligence Matrix"
                          data={reports.length > 0 ? reports.slice(0, 6).map(r => ({ label: r.facilityName.split(' ')[0], value: r.extractedData?.confidence ? r.extractedData.confidence * 100 : Math.random() * 50 + 40, color: 'from-emerald-400 to-emerald-600' })) : [
                            { label: 'Scraping...', value: 10, color: 'from-slate-400 to-slate-600' }
                          ]}
                        />
                     </div>
                     <div className="glass-card p-10 rounded-[3rem] border-white/10 relative overflow-hidden shadow-2xl min-h-[400px]">
                        <MissionPieChart 
                          title="Resource Nodes"
                          data={[
                            { label: 'Project Files', value: activeProject.reports.length, color: 'emerald' },
                            { label: 'Verified Web', value: Math.max(0, reports.length - activeProject.reports.length), color: 'blue' },
                            { label: 'Risk Hubs', value: deserts.length, color: 'rose' },
                          ]}
                        />
                     </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    {[
                      { label: 'Internal Nodes', val: activeProject.reports.length.toString(), color: 'emerald', icon: Database, sub: 'File Extracted' },
                      { label: 'Satellite Links', val: `${reports.length}`, color: 'blue', icon: Globe, sub: 'Web Grounded' },
                      { label: 'Consensus Level', val: '94.2%', color: 'amber', icon: ShieldCheck, sub: 'Stable' },
                      { label: 'Audit Log', val: `${auditLogs.length}`, color: 'rose', icon: ClipboardList, sub: 'System Records' }
                    ].map((stat, i) => (
                      <div key={i} className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group shadow-xl border-white/10">
                        <div className="flex items-center justify-between mb-6">
                          <div className={`p-4 bg-${stat.color}-500/10 rounded-2xl text-${stat.color}-400 transition-all`}><stat.icon className="w-6 h-6" /></div>
                          <span className={`text-${stat.color}-400 text-[9px] font-black tracking-widest uppercase`}>{stat.sub}</span>
                        </div>
                        <h4 className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-[0.3em] mb-1">{stat.label}</h4>
                        <p className="text-3xl font-black text-[var(--text-main)] tracking-tighter">{stat.val}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {viewState === 'analysis' && (
                 <div className="flex flex-col gap-10 pb-48">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 min-h-0">
                      <div className="lg:col-span-4 h-full"><AgentTrace steps={steps} /></div>
                      <div className="lg:col-span-8 space-y-8 h-full flex flex-col min-h-0">
                        <div className="glass-card rounded-[3.5rem] p-6 lg:p-12 h-full relative overflow-hidden flex flex-col min-h-[600px] shadow-2xl border-white/10">
                            {isThinking ? (
                              <div className="flex flex-col items-center justify-center flex-1 gap-12 text-center animate-pulse">
                                  <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center border border-emerald-500/20"><Loader2 className="w-10 h-10 animate-spin text-emerald-500" /></div>
                                  <div>
                                     <h3 className="text-3xl font-black tracking-tighter text-[var(--text-main)] mb-4">Synthesizing Context...</h3>
                                     <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.4em]">Resolving federated data nodes</p>
                                  </div>
                              </div>
                            ) : plan ? (
                              <div className="overflow-y-auto pr-6 custom-scrollbar flex-1 space-y-10">
                                  <div className="text-[var(--text-main)] text-base lg:text-lg leading-[2] font-medium bg-emerald-500/[0.01] border border-white/[0.04] p-10 lg:p-16 rounded-[3.5rem] shadow-inner relative backdrop-blur-sm overflow-hidden">
                                    <MarkdownRenderer content={plan} />
                                  </div>
                                  {groundingLinks.length > 0 && (
                                    <div className="p-10 glass-card rounded-[3rem] border-white/10 space-y-4 shadow-xl">
                                      <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-8 flex items-center gap-3"><Globe className="w-4 h-4" /> Internet Grounding Results</h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {groundingLinks.map((link, idx) => (
                                          <a key={idx} href={link.web?.uri || '#'} target="_blank" rel="noopener noreferrer" className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between group hover:bg-emerald-500/10 transition-all">
                                            <div className="min-w-0">
                                              <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-tight truncate group-hover:text-emerald-400">{link.web?.title || 'Report Node'}</p>
                                              <p className="text-[9px] font-bold text-[var(--text-muted)] truncate mt-1">{link.web?.uri}</p>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center flex-1 text-slate-500 gap-8">
                                  <div className="p-10 rounded-full bg-white/5 border border-white/10"><Cpu className="w-16 h-16 text-slate-500 opacity-20" /></div>
                                  <h3 className="text-2xl font-black tracking-tighter text-[var(--text-main)]">Standby</h3>
                                  <motion.button whileHover={{ scale: 1.05 }} onClick={handleAgenticWorkflow} className="mt-6 px-12 py-6 bg-emerald-500 text-emerald-950 font-black uppercase tracking-widest text-[11px] rounded-[2rem] flex items-center gap-3 shadow-2xl">Refresh Project Synthesis</motion.button>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                 </div>
              )}

              {viewState === 'map' && activeProject && (
                <div className="flex flex-col gap-6 h-full pb-48">
                   <div className="flex-1 min-h-[600px] rounded-[3.5rem] overflow-hidden glass-card relative group shadow-4xl border-white/10">
                      <RegionalMap deserts={deserts} theme={theme} hospitals={reports} />
                   </div>
                </div>
              )}

              {viewState === 'simulation' && activeProject && (
                <div className="space-y-10 pb-48">
                   <div className="flex flex-col sm:flex-row items-center gap-6 justify-between bg-white/[0.04] p-10 rounded-[3rem] border border-white/10 shadow-xl">
                      <div className="flex-1 w-full relative">
                         <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
                         <input 
                           type="text" 
                           value={kbSearch} 
                           onChange={(e) => setKbSearch(e.target.value)} 
                           placeholder="Query knowledge matrix..." 
                           className="w-full bg-[var(--input-bg)] border border-white/10 rounded-3xl py-6 pl-20 pr-8 focus:ring-1 focus:ring-emerald-500/40 outline-none text-sm font-medium text-[var(--text-main)]" 
                         />
                      </div>
                      <button onClick={() => setIsAddNodeOpen(true)} className="flex items-center gap-3 px-10 py-6 bg-emerald-500 text-emerald-950 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105"><Plus className="w-5 h-5" /> Ingest Node</button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                     {filteredReports.map(report => (
                       <motion.div key={report.id} whileHover={{ scale: 1.02, y: -5 }} onClick={() => setSelectedReport(report)} className="glass-card p-10 rounded-[2.5rem] border border-white/10 hover:border-emerald-500/30 transition-all group cursor-pointer shadow-lg hover:shadow-2xl flex flex-col h-full">
                         <div className="flex items-center justify-between mb-8">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all"><Database className="w-6 h-6" /></div>
                            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Protocol V2</span>
                         </div>
                         <h4 className="text-xl font-black mb-1 text-[var(--text-main)] group-hover:text-emerald-400 transition-colors truncate">{report.facilityName}</h4>
                         <p className="text-[10px] font-black text-[var(--text-muted)] uppercase flex items-center gap-2 mb-8 truncate"><MapPin className="w-4 h-4 text-emerald-500" /> {report.region || 'Remote Hub'}</p>
                         <div className="mt-auto pt-6 border-t border-[var(--border-subtle)] flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{report.reportDate}</span>
                            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-all" />
                         </div>
                       </motion.div>
                     ))}
                   </div>
                </div>
              )}

              {viewState === 'audit' && (
                <div className="space-y-4 pb-48">
                   <div className="p-10 bg-white/[0.04] rounded-[3rem] border border-white/10 mb-8 flex items-center justify-between shadow-xl">
                     <h3 className="text-2xl font-black tracking-tighter text-[var(--text-main)]">Project Logs</h3>
                     <Terminal className="w-6 h-6 text-emerald-500" />
                   </div>
                   <div className="space-y-4">
                    {filteredAudit.map(log => (
                      <div key={log.id} className="p-8 glass-card rounded-3xl flex items-center justify-between border-white/10 group transition-all shadow-md">
                        <div className="flex items-center gap-6">
                          <div className={`p-4 rounded-2xl ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}><CheckCircle2 className="w-5 h-5" /></div>
                          <div>
                            <p className="text-sm font-black text-[var(--text-main)] uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{log.event}</p>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase mt-1"><span>{log.timestamp}</span> • <span>{log.user}</span></p>
                          </div>
                        </div>
                        <div className="hidden sm:block text-[9px] font-mono text-slate-500 uppercase tracking-tighter">NODE_{Math.random().toString(16).slice(2, 6).toUpperCase()}</div>
                      </div>
                    ))}
                   </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <ReportDetail 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
          onIntervention={handleIntervention}
        />
        <AIChatBot reports={reports} deserts={deserts} />

        {/* Persistence Modals */}
        <AnimatePresence>
          {isLoginOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLoginOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md glass-card rounded-[3.5rem] p-12 sm:p-16 border-white/10 shadow-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={() => setIsLoginOpen(false)} className="absolute top-10 right-10 p-4 rounded-2xl bg-white/5 text-slate-500 hover:text-[var(--text-main)] transition-colors"><X className="w-6 h-6" /></button>
                <div className="mb-14 text-center sm:text-left"><Key className="w-12 h-12 text-emerald-400 mb-6 mx-auto sm:mx-0" /><h3 className="text-4xl font-black tracking-tighter text-[var(--text-main)]">Identity Scan</h3><p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">Resume Secure Identity</p></div>
                <form onSubmit={handleLoginSubmit} className="space-y-8">
                  <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Email Sequence</label><input required type="email" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} placeholder="agent@vip.layer" className="w-full bg-[var(--input-bg)] border border-white/10 rounded-2xl px-8 py-6 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 transition-all" /></div>
                  <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Access Token</label><input required type="password" value={formData.password} onChange={(e) => setFormData(p => ({...p, password: e.target.value}))} placeholder="••••••••••••" className="w-full bg-[var(--input-bg)] border border-white/10 rounded-2xl px-8 py-6 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 transition-all" /></div>
                  {authError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest px-2">{authError}</p>}
                  <button type="submit" className="w-full py-7 bg-emerald-500 text-emerald-950 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 shadow-2xl transition-all mt-4">Verify RSA Identity</button>
                </form>
              </motion.div>
            </div>
          )}

          {isGetStartedOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsGetStartedOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md glass-card rounded-[3.5rem] p-12 sm:p-16 border-white/10 shadow-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={() => setIsGetStartedOpen(false)} className="absolute top-10 right-10 p-4 rounded-2xl bg-white/5 text-slate-500 hover:text-[var(--text-main)] transition-colors"><X className="w-6 h-6" /></button>
                <div className="mb-14 text-center sm:text-left"><UserPlus className="w-12 h-12 text-emerald-400 mb-6 mx-auto sm:mx-0" /><h3 className="text-4xl font-black tracking-tighter text-[var(--text-main)]">New Enrollment</h3><p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2">Initialize Credentials Node</p></div>
                <form onSubmit={handleRegisterSubmit} className="space-y-8">
                  <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Operator Name</label><input required type="text" value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} placeholder="Designation Name" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 transition-all" /></div>
                  <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Email Sequence</label><input required type="email" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} placeholder="agent@vip.layer" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 transition-all" /></div>
                  <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Secure Password</label><input required type="password" value={formData.password} onChange={(e) => setFormData(p => ({...p, password: e.target.value}))} placeholder="Min 6 characters" className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-8 py-6 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 transition-all" /></div>
                  {authError && <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest px-2">{authError}</p>}
                  <button type="submit" className="w-full py-7 bg-emerald-500 text-emerald-950 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 shadow-2xl transition-all mt-4">Confirm Enrollment</button>
                </form>
              </motion.div>
            </div>
          )}

          {isCreateProjectOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateProjectOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-xl glass-card rounded-[4rem] p-12 sm:p-20 border-white/10 shadow-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={() => setIsCreateProjectOpen(false)} className="absolute top-12 right-12 p-4 rounded-2xl bg-white/5 text-slate-500 hover:text-[var(--text-main)] transition-colors"><X className="w-6 h-6" /></button>
                <div className="mb-14"><h3 className="text-3xl font-black tracking-tighter text-[var(--text-main)] uppercase text-center sm:text-left">Initialize Hub</h3><p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-2 text-center sm:text-left">Omni-File Agentic Analysis Engine</p></div>
                <form onSubmit={handleCreateProject} className="space-y-10">
                   <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Project Codename</label><input required type="text" value={newProjectData.name} onChange={(e) => setNewProjectData(p => ({...p, name: e.target.value}))} placeholder="e.g. OPERATION_PHOENIX_2025" className="w-full bg-[var(--input-bg)] border border-white/10 rounded-3xl px-8 py-6 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 transition-all" /></div>
                   
                   <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">Source Documentation</label>
                     <div className="relative group">
                       <input 
                        type="file" 
                        multiple 
                        onChange={(e) => setNewProjectData(p => ({...p, files: Array.from(e.target.files || [])}))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                       />
                       <div className="p-16 border-2 border-dashed border-[var(--border-subtle)] rounded-[3rem] bg-[var(--input-bg)] group-hover:bg-emerald-500/5 group-hover:border-emerald-500/30 transition-all flex flex-col items-center justify-center text-center gap-6 shadow-inner">
                          <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform"><Upload className="w-8 h-8" /></div>
                          <div>
                            <p className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Deploy Files to Agent</p>
                            <p className="text-[10px] font-bold text-[var(--text-muted)] mt-2">All major medical & data formats supported</p>
                          </div>
                          {newProjectData.files.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                               {newProjectData.files.map((f, i) => (
                                 <span key={i} className="px-4 py-2 bg-emerald-500/20 rounded-xl text-[9px] font-black text-emerald-400 border border-emerald-500/20">{f.name}</span>
                               ))}
                            </div>
                          )}
                       </div>
                     </div>
                   </div>

                   <button type="submit" className="w-full py-8 bg-emerald-500 text-emerald-950 text-[11px] font-black uppercase tracking-[0.3em] rounded-3xl hover:bg-emerald-400 shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95">
                      <Wand2 className="w-5 h-5" /> Initialize & Analyze
                   </button>
                </form>
              </motion.div>
            </div>
          )}

          {isAddNodeOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddNodeOpen(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-md glass-card rounded-[3.5rem] p-12 sm:p-16 border-white/10 shadow-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <button onClick={() => setIsAddNodeOpen(false)} className="absolute top-10 right-10 p-4 rounded-2xl bg-white/5 text-slate-500 hover:text-[var(--text-main)] transition-colors"><X className="w-6 h-6" /></button>
                <div className="mb-10 text-center sm:text-left"><h3 className="text-2xl font-black tracking-tighter text-[var(--text-main)] uppercase">Manual Ingestion</h3><p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">Manual node placement</p></div>
                <form onSubmit={handleAddNode} className="space-y-8">
                   <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Facility Name</label><input required type="text" value={newNodeData.facilityName} onChange={(e) => setNewNodeData(p => ({...p, facilityName: e.target.value}))} placeholder="Facility Designation" className="w-full bg-[var(--input-bg)] border border-white/10 rounded-2xl px-8 py-6 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 transition-all" /></div>
                   <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Region</label><input required type="text" value={newNodeData.region} onChange={(e) => setNewNodeData(p => ({...p, region: e.target.value}))} placeholder="Geographic Region" className="w-full bg-[var(--input-bg)] border border-white/10 rounded-2xl px-8 py-6 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 transition-all" /></div>
                   <div className="space-y-3"><label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Context Transcript</label><textarea required rows={5} value={newNodeData.unstructuredText} onChange={(e) => setNewNodeData(p => ({...p, unstructuredText: e.target.value}))} placeholder="Unstructured Context Sequence..." className="w-full bg-[var(--input-bg)] border border-white/10 rounded-2xl px-8 py-6 text-sm text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 transition-all resize-none" /></div>
                   <button type="submit" className="w-full py-7 bg-emerald-500 text-emerald-950 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-400 shadow-2xl transition-all">Verify & Ingest</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  );
};

export default App;
