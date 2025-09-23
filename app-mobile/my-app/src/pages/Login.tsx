// src/pages/Login.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import TypingTitle from '../components/TypingTitle';
import { loginUser, applyAuthToken } from '../services/auth';
import Toast from '../components/Toast';

import landingImg from '../assets/landing.jpg';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [expiredMsg, setExpiredMsg] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const location = useLocation();
  const loggedOut = location.state?.loggedOut || false;
  const [showLoggedOutToast, setShowLoggedOutToast] = useState(loggedOut);

  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (localStorage.getItem('sessionExpiredNotice') === '1') {
        setExpiredMsg('Your session expired. Please sign in again.');
        localStorage.removeItem('sessionExpiredNotice');
      }
    } catch {/* no-op */ }
  }, []);

  useEffect(() => {
    if (!showLoggedOutToast) return;
    const t = setTimeout(() => setShowLoggedOutToast(false), 1000);
    return () => clearTimeout(t);
  }, [showLoggedOutToast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginUser(email, password);
      if (res?.token) applyAuthToken(res.token);
      if (res?.user) localStorage.setItem('user', JSON.stringify(res.user));
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (err: any) {
      alert(err?.message || 'Login failed');
    }
  };

  return (
   
    <div className="relative min-h-screen flex flex-col lg:flex-row bg-transparent lg:bg-white dark:bg-transparent lg:dark:bg-gray-900 overflow-hidden">
      {/* Mobile full-screen background */}
      <img
        src={landingImg}
        alt="WeatherToWear landing"
        className="absolute inset-0 -z-10 h-full w-full object-cover lg:hidden"
      />
      <div className="absolute inset-0 -z-10 bg-black/10 lg:hidden" />

      {/* Desktop left image panel */}
      <div className="relative hidden lg:block lg:w-1/2 lg:min-h-screen shrink-0">

        <img
          src={landingImg}
          alt="WeatherToWear landing"
          className="absolute inset-0 z-0 h-full w-full object-cover "
        />
        <div className="absolute inset-0 z-0 bg-black/10 lg:hidden pointer-events-none" />
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Right: content */}
      <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 min-h-screen lg:min-h-0">
        {/* Mobile: white rounded box; Desktop: transparent */}
        <div className="
          w-full max-w-sm sm:max-w-md 
          bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur
          lg:bg-transparent lg:dark:bg-transparent lg:shadow-none lg:backdrop-blur-0 lg:p-8
        ">
          {/* Desktop: center logo, typed title under it */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="/logo-nobg.png"   /* from public/ */
              alt="Logo"
              className="w-24 h-24 sm:w-28 sm:h-28"
              loading="lazy"
            />
            <h1 className="mt-3 text-3xl sm:text-4xl font-sephir font-semibold tracking-tight text-black dark:text-gray-100 text-center">
              <span className="text-black dark:text-black">
                <TypingTitle text="WeatherToWear" highlight="ToWear" />
              </span>
            </h1>
          </div>

          <form onSubmit={handleLogin}>
            <h2 className="text-3xl font-light mb-4 text-black dark:text-gray-100 text-center lg:text-left">
              Login
            </h2>

            {expiredMsg && (
              <div
                className="mb-4 rounded-md bg-yellow-100 text-yellow-900 px-3 py-2 text-sm"
                role="status"
                aria-live="polite"
              >
                {expiredMsg}
              </div>
            )}

            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full mb-4 px-4 py-2 rounded-full bg-white dark:bg-gray-700 border border-black dark:border-gray-600 text-black dark:text-gray-100 focus:outline-none"
              required
            />

            <div className="relative mb-4">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-full bg-white dark:bg-gray-700 border border-black dark:border-gray-600 text-black dark:text-gray-100 focus:outline-none"
                required
              />
              <img
                src={showPassword ? '/eye_closed.png' : '/eye.png'}
                alt="Toggle visibility"
                className="w-5 h-5 absolute top-2.5 right-4 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#3F978F] hover:bg-[#2c716c] text-white py-2 rounded-full mb-3 transition-colors duration-200"
            >
              Login
            </button>

            <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
              Don’t have an account yet?{' '}
              <Link to="/signup" className="text-[#3F978F] underline">
                Signup?
              </Link>
            </p>
          </form>
        </div>
      </div>

      {showToast && <Toast message="Logged in successfully!" />}
      {showLoggedOutToast && <Toast message="Logged out successfully!" />}
    </div>
    
  );
}
