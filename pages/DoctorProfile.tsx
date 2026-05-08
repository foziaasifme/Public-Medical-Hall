import React from 'react';
import { Briefcase, MapPin, User, Languages as LangIcon, ShieldCheck, LayoutDashboard, Phone, Mail } from 'lucide-react';

interface DoctorProfileProps {
  standalone?: boolean;
}

const DoctorProfile: React.FC<DoctorProfileProps> = ({ standalone }) => {
  return (
    <div className={`space-y-8 animate-in fade-in duration-700 pb-20 ${standalone ? 'max-w-7xl mx-auto p-6 md:p-12' : ''}`}>
      {standalone && (
        <div className="flex justify-end mb-6">
          <button 
            onClick={() => window.location.hash = ''}
            className="flex items-center gap-2 bg-medical-blue text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg hover:-translate-y-1"
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
        </div>
      )}
      {/* Profile Header */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col md:flex-row">
        <div className="md:w-1/3 h-80 md:h-auto relative">
          <img 
            src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEhh-i9gOjyhwEray7cvMv7SQ81RcTAe5DtNa84kzU5pSXGC089rNh1ZBQ2LkGQbEvSgCesoBemqCf8zdg_DQK6XrWefoUTQTRfuwPVQD9vjMkgLOpuS8Q1VMvGSTLeHOKx6JOjefJXNvrgMEi9lcBigww-U6SYCMY2ooxP2P64xOIbbiuLOfMzj-51sZ08/s320/PMH_logo.png" 
            alt="Contact Person Profile" 
            className="w-full h-full object-cover p-8 md:p-12"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6 md:hidden">
            <div>
              <h2 className="text-2xl font-black text-white">Waqar Ahmad</h2>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-1">Contact Person / Management</p>
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={14} /> Verified Management
              </p>
            </div>
          </div>
        </div>
        <div className="md:w-2/3 p-8 md:p-12 flex flex-col justify-center">
            <div className="hidden md:block mb-6">
              <h2 className="text-4xl font-black text-gray-800 tracking-tight">Waqar Ahmad</h2>
              <p className="text-blue-600 font-bold uppercase tracking-widest text-sm mt-1">Contact Person / Management</p>
              <div className="mt-4 h-1 w-20 bg-blue-600 rounded-full"></div>
            </div>
            
            <p className="text-gray-600 text-lg leading-relaxed mb-8 italic">
              "Dedicated to managing Public Medical Hall with integrity and ensuring the highest standards of pharmacy service for our community."
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Office Location</p>
                    <p className="text-sm font-bold text-gray-800">Lodhran, Pakistan</p>
                  </div>
               </div>
               <div className="flex items-center gap-4 p-4 bg-medical-light rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mobile / WhatsApp</p>
                    <p className="text-sm font-bold text-gray-800">+923006855515</p>
                  </div>
               </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Business Overview */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
            <Briefcase className="text-blue-600" size={24} /> Management Focus
          </h3>
          
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
               <h4 className="font-black text-gray-800 leading-none">Pharmacy Operations</h4>
               <p className="text-xs text-gray-500 mt-2">Overseeing inventory, supply chain management, and clinical standards at Public Medical Hall.</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
               <h4 className="font-black text-gray-800 leading-none">Customer Excellence</h4>
               <p className="text-xs text-gray-500 mt-2">Focusing on providing reliable renal care medications and laboratory reporting accuracy.</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
           {/* Contact Info */}
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
             <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
               <Mail className="text-blue-600" size={24} /> Contact Information
             </h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                   <div className="flex items-center gap-3">
                      <Phone size={16} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-700">Phone</span>
                   </div>
                   <span className="text-sm text-gray-600">+92 300 6855515</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                   <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-gray-400" />
                      <span className="text-sm font-bold text-gray-700">Address</span>
                   </div>
                   <span className="text-sm text-gray-600 text-right">Railway Chowk, Lodhran</span>
                </div>
             </div>
           </div>

           {/* Profile Details */}
           <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                   <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                     <User size={12}/> Role
                   </h4>
                   <p className="text-sm font-bold text-gray-800">Administrator</p>
                </div>
                <div>
                   <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                     <LangIcon size={12}/> Languages
                   </h4>
                   <p className="text-sm font-bold text-gray-800">Urdu, Punjabi, English</p>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;
