import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Button } from '../components/ui/Button';
import { ADMIN_PASS } from '../constants';
import { Lock, User as UserIcon, Wifi, Database, CloudSun, Bell, Phone, LogIn, HelpCircle } from 'lucide-react';
import { storageService } from '../services/storageService';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [companyName, setCompanyName] = useState('MEDIPOS');
  const [weather, setWeather] = useState<{temp: number | null, desc: string}>({ temp: null, desc: 'Fetching weather...' });
  const [latestStockEntry, setLatestStockEntry] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      const settings = await storageService.getCompanySettings();
      if (settings && settings.name) {
        setCompanyName(settings.name);
      }
    };
    const fetchLatestStockEntry = async () => {
      const entries = await storageService.getStockEntries();
      const inEntries = entries.filter(e => e.type === 'IN');
      if (inEntries.length > 0) {
        inEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLatestStockEntry(inEntries[0]);
      }
    };
    fetchCompanySettings();
    fetchLatestStockEntry();
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
            const data = await res.json();
            if (data.current_weather) {
              const code = data.current_weather.weathercode;
              let desc = 'Clear';
              if (code >= 1 && code <= 3) desc = 'Partly Cloudy';
              if (code >= 45 && code <= 48) desc = 'Foggy';
              if (code >= 51 && code <= 67) desc = 'Rainy';
              if (code >= 71 && code <= 77) desc = 'Snowy';
              if (code >= 80 && code <= 82) desc = 'Showers';
              if (code >= 95) desc = 'Thunderstorm';
              
              setWeather({
                temp: Math.round(data.current_weather.temperature),
                desc
              });
            }
          } catch (e) {
            setWeather({ temp: null, desc: 'Weather unavailable' });
          }
        },
        () => {
          setWeather({ temp: null, desc: 'Location access denied' });
        }
      );
    } else {
      setWeather({ temp: null, desc: 'Location not supported' });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users = await storageService.getUsers();
    
    // Check dynamic users first
    const foundUser = users.find(u => u.username === username && u.password === password);
    if (foundUser) {
      onLogin(foundUser);
      return;
    }

    // Fallback to hardcoded defaults if not matched dynamically
    if (username === 'admin' && password === ADMIN_PASS) {
      onLogin({
        id: 'default-admin',
        username: 'admin',
        role: 'admin',
        permissions: { inventory: true, stock: true, suppliers: true, settings: true }
      });
    } else if (username === 'staff' && password === 'staff') {
      onLogin({
        id: 'default-staff',
        username: 'staff',
        role: 'staff',
        permissions: { inventory: false, stock: true, suppliers: false, settings: false }
      });
    } else {
      setError('Invalid credentials');
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const formattedDate = currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', weekday: 'long' });

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#e11d48] via-[#7e22ce] to-[#1e1b4b] overflow-hidden text-white flex flex-col font-sans relative">
      
      {/* Decorative large circles for background effect */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] bg-purple-600/30 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] left-[10%] w-[50%] h-[60%] bg-pink-600/20 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Header */}
      <header className="flex justify-between items-center p-6 lg:px-12 relative z-50 w-full">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhh-i9gOjyhwEray7cvMv7SQ81RcTAe5DtNa84kzU5pSXGC089rNh1ZBQ2LkGQbEvSgCesoBemqCf8zdg_DQK6XrWefoUTQTRfuwPVQD9vjMkgLOpuS8Q1VMvGSTLeHOKx6JOjefJXNvrgMEi9lcBigww-U6SYCMY2ooxP2P64xOIbbiuLOfMzj-51sZ08/s320/PMH_logo.png" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           </div>
           <h1 className="tracking-wide"><span className="font-bold text-[27px] leading-[34px]">{companyName}</span></h1>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
           <div className="flex items-center gap-2">
             <Wifi className="text-green-400" size={18} />
             <div className="flex flex-col leading-tight hidden sm:flex">
               <span>Internet</span>
               <span className="text-[10px] text-green-400 uppercase tracking-widest">Online</span>
             </div>
           </div>
           <div className="flex items-center gap-2">
             <Database className="text-green-400" size={18} />
             <div className="flex flex-col leading-tight hidden sm:flex">
               <span>Server</span>
               <span className="text-[10px] text-green-400 uppercase tracking-widest">Online</span>
             </div>
           </div>
           <div className="relative group flex items-center gap-2 ml-2 sm:ml-4 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md cursor-pointer hover:bg-white/20 transition-colors">
             <HelpCircle size={16} />
             <span>Help</span>
             
             {/* Floating Window (Popover) */}
             <div className="absolute top-full right-0 mt-4 w-80 bg-[#1e1b4b] border border-white/20 rounded-2xl shadow-2xl p-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right z-50 text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
               <h3 className="text-lg font-bold mb-3 border-b border-white/10 pb-2">About {companyName}</h3>
               <div className="space-y-3 text-sm font-light">
                 <p><span className="font-semibold text-pink-200">Location:</span> Main Street Medical District</p>
                 <p><span className="font-semibold text-pink-200">Contact:</span> +92 302 683 4300</p>
                 <p><span className="font-semibold text-pink-200">Timing:</span> Full Week (8:00 AM - 7:00 PM)</p>
                 
                 <div className="border-t border-white/10 pt-2 mt-2">
                   <h4 className="font-semibold text-pink-200 mb-1">Legal Info</h4>
                   <p className="text-xs opacity-80 leading-relaxed">By using this system, you agree to our Terms of Service (TORs) and Privacy Policy regarding patient data handling.</p>
                 </div>
                 
                 <div className="border-t border-white/10 pt-3 mt-4 bg-black/20 -mx-6 -mb-6 p-6 rounded-b-2xl">
                   <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">Developer</h4>
                   <div className="space-y-1.5 text-xs">
                     <a href="http://mediaplus1.vercel.app/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-pink-300 transition-colors">
                       <span className="opacity-70">🔗</span> Mediaplus
                     </a>
                     <a href="https://wa.me/923036834300" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-pink-300 transition-colors">
                       <span className="opacity-70">✆</span> +923036834300 (WhatsApp)
                     </a>
                     <a href="mailto:m.asif.anwar@gmail.com" className="flex items-center gap-2 hover:text-pink-300 transition-colors">
                       <span className="opacity-70">✉</span> m.asif.anwar@gmail.com
                     </a>
                   </div>
                 </div>
               </div>
             </div>
           </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 lg:p-12 gap-12 relative z-10 w-full max-w-[1600px] mx-auto">
        {/* Left Column - Date, Time, Weather, Notifications */}
        <div className="w-full lg:w-1/3 flex flex-col gap-10">
          
          {/* Date & Time */}
          <div className="flex flex-col">
            <p className="text-lg opacity-90 text-pink-100 font-medium">{formattedDate}</p>
            <div className="flex items-start gap-6 mt-1">
               <h2 className="text-8xl font-light tracking-tighter leading-none shadow-sm">{formattedTime}</h2>
            </div>
            <div className="flex items-center gap-3 mt-4 text-pink-100">
                 <CloudSun size={32} className="text-yellow-400 drop-shadow-md" />
                 <span className="text-3xl font-semibold">{weather.temp !== null ? `${weather.temp}°` : '--°'}</span>
                 <span className="text-sm opacity-90 font-medium tracking-wide">{weather.desc}</span>
            </div>
          </div>

          {/* Notifications */}
          <div className="flex-1 mt-6">
             <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-70 mb-4 flex items-center gap-2 text-pink-100">
               <Bell size={14}/> NOTIFICATIONS
             </h3>
             <div className="space-y-3">
               
               {latestStockEntry && (
                 <div className="bg-white/10 hover:bg-white/15 border border-white/5 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 transition-colors cursor-default">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center font-bold shadow-lg">S</div>
                   <div className="flex flex-col">
                     <span className="font-semibold text-sm">New Stock Received!</span>
                     <span className="text-xs opacity-60">
                       {new Date(latestStockEntry.date).toLocaleDateString()} {new Date(latestStockEntry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                   </div>
                 </div>
               )}

               <div className="bg-white/10 hover:bg-white/15 border border-white/5 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 transition-colors cursor-default">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center font-bold shadow-lg">N</div>
                 <div className="flex flex-col">
                   <span className="font-semibold text-sm">New order received!</span>
                   <span className="text-xs opacity-60">15:27</span>
                 </div>
               </div>

               <div className="bg-white/10 hover:bg-white/15 border border-white/5 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 transition-colors cursor-default">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center font-bold shadow-lg">U</div>
                 <div className="flex flex-col">
                   <span className="font-semibold text-sm">System update pending</span>
                   <span className="text-xs opacity-60">09:00</span>
                 </div>
               </div>

             </div>
          </div>

          {/* Footer info (Mobile & Desktop) */}
          <div className="mt-auto pt-8 flex justify-between items-end opacity-60 text-xs">
             <a href="https://wa.me/923026834300" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-100 transition-opacity cursor-pointer text-pink-100">
               <Phone size={16} />
               <span className="font-medium">+923026834300</span>
             </a>
             <a href="http://mediaplus1.vercel.app" target="_blank" rel="noopener noreferrer" className="text-pink-100 hover:opacity-100 transition-opacity">Mediaplus</a>
          </div>
        </div>

        {/* Right Column - Login Overlay */}
        <div className="w-full lg:w-2/3 flex items-center justify-center lg:justify-end">
           <div className="bg-[#1e1b4b]/40 backdrop-blur-2xl border border-white/10 p-10 sm:p-12 rounded-[2rem] shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in duration-500">
              <div className="flex items-center justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg shadow-pink-500/30">
                  <LogIn size={32} className="text-white" />
                </div>
              </div>
              
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
                <p className="text-pink-100/70 text-sm">Please login to your account</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-pink-100/70 ml-1 uppercase tracking-wider">Username</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-pink-400 transition-colors" size={20} />
                    <input 
                      type="text" 
                      className="w-full bg-[#1e1b4b]/60 border border-white/10 rounded-2xl px-4 py-4 pl-12 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                      placeholder="Enter username..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-pink-100/70 ml-1 uppercase tracking-wider">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-pink-400 transition-colors" size={20} />
                    <input 
                      type="password" 
                      className="w-full bg-[#1e1b4b]/60 border border-white/10 rounded-2xl px-4 py-4 pl-12 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-medium"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm text-center font-medium py-3 rounded-xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 border-none py-4 text-lg font-bold rounded-2xl shadow-lg shadow-pink-500/30 text-white transition-all transform hover:-translate-y-1">
                  Login to System
                </Button>
              </form>

              <div className="mt-8 text-center space-y-1">
                 <p className="text-xs text-white/40">Default Admin: admin / 1234</p>
                 <p className="text-xs text-white/40">Default Staff: staff / staff</p>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
