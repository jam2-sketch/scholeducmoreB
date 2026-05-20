import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScholeduc } from '../../ScholeducProvider';
import { User, Mail, Lock, Calendar, ClipboardList } from 'lucide-react';

export default function LoginView() {
  const { login, register } = useScholeduc();
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (!displayName || !age || !sex || !email || !password) {
          throw new Error('Please fill in all fields');
        }
        await register(email, password, displayName, parseInt(age), sex);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden py-12 px-4">
      {/* Decorative Blur Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-100/30 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-orange-100/20 blur-[100px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl shadow-brand-text/5 border border-brand-border overflow-hidden relative z-10"
      >
        <div className="p-8 md:p-12">
          <div className="text-center mb-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-brand-text rounded-2xl flex items-center justify-center text-white font-serif italic text-4xl mb-6 shadow-2xl shadow-brand-text/20 transform -rotate-12">S</div>
            <h1 className="text-3xl font-serif text-brand-text tracking-tight mb-2">
              Scholeduc <span className="opacity-30">{isRegistering ? 'Registration' : 'Login'}</span>
            </h1>
            <p className="text-brand-text/40 leading-relaxed font-serif text-lg px-4">
              {isRegistering ? 'Create your academic profile.' : 'Continue your educational journey.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl pl-12 pr-4 py-4 text-brand-text focus:outline-none focus:border-brand-text/20 transition-all font-serif italic text-lg"
                      required={isRegistering}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                      <input
                        type="number"
                        placeholder="Age"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full bg-brand-bg border border-brand-border rounded-2xl pl-12 pr-4 py-4 text-brand-text focus:outline-none focus:border-brand-text/20 transition-all font-serif italic text-lg"
                        required={isRegistering}
                      />
                    </div>
                    <div className="relative">
                      <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                      <select
                        value={sex}
                        onChange={(e) => setSex(e.target.value)}
                        className="w-full bg-brand-bg border border-brand-border rounded-2xl pl-12 pr-4 py-4 text-brand-text focus:outline-none focus:border-brand-text/20 transition-all font-serif italic text-lg appearance-none"
                        required={isRegistering}
                      >
                        <option value="" disabled>Sex</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-2xl pl-12 pr-4 py-4 text-brand-text focus:outline-none focus:border-brand-text/20 transition-all font-serif italic text-lg"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-2xl pl-12 pr-4 py-4 text-brand-text focus:outline-none focus:border-brand-text/20 transition-all font-serif italic text-lg"
                required
              />
            </div>

            {error && (
              <p className="text-xs text-orange-600 font-bold bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center uppercase tracking-widest">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-text text-white py-5 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-brand-text/20 hover:scale-[1.02] transition-all transform active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Processing...' : isRegistering ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text/40 hover:text-brand-text transition-colors"
            >
              {isRegistering ? 'Return to Login' : "Don't have an account? Register"}
            </button>
          </div>
        </div>

        <div className="bg-brand-bg p-8 text-center border-t border-brand-border">
          <p className="text-[10px] text-brand-text/20 uppercase tracking-[0.4em] font-bold">
            Project Scholeduc <span className="mx-2 opacity-50">•</span> v2.0
          </p>
        </div>
      </motion.div>
    </div>
  );
}
