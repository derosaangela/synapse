
import React from 'react';
import { signInWithGoogle } from '../firebase';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full space-y-8 glass-card p-10 border shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="flex justify-center mb-6">
             <div className="relative group">
              <div className="absolute -inset-1 bg-indigo-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  className="w-full h-full text-indigo-600 drop-shadow-sm" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" 
                    fill="currentColor" 
                  />
                </svg>
              </div>
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
            Welcome to Synapse
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium italic">
            Your personal industry knowledge base & network.
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <button
            onClick={signInWithGoogle}
            className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-sm font-black uppercase tracking-widest rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-xl shadow-indigo-100 active:scale-95"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg className="h-5 w-5 text-indigo-400 group-hover:text-indigo-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.908 3.153-1.908 4.153-1.228 1.228-3.14 2.508-6.932 2.508-6.04 0-10.72-4.88-10.72-10.92s4.68-10.92 10.72-10.92c3.28 0 5.64 1.28 7.36 2.92l2.36-2.36C18.96 1.48 15.68 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c3.6 0 6.6-1.2 8.84-3.52 2.32-2.32 3.12-5.56 3.12-8.16 0-.6-.04-1.2-.12-1.8h-11.84z"/>
              </svg>
            </span>
            Sign in with Google
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-[0.2em]">
            Secure cloud sync powered by Firebase
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
