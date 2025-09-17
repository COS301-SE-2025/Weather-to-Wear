// src/pages/Login.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TypingTitle from '../components/TypingTitle';
import { loginUser, applyAuthToken } from '../services/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expiredMsg, setExpiredMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      if (localStorage.getItem('sessionExpiredNotice') === '1') {
        setExpiredMsg('Your session expired. Please sign in again.');
        localStorage.removeItem('sessionExpiredNotice');
      }
    } catch {
      // no op
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await loginUser(email, password);
      if (res?.token) applyAuthToken(res.token);
      if (res?.user) localStorage.setItem('user', JSON.stringify(res.user));

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      alert(err?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-gray-900">
      <div className="w-full lg:w-1/2 bg-black flex flex-col items-center justify-center p-6 sm:p-8">
        <h1 className="text-white text-4xl sm:text-4xl mb-4 font-sephir font-semibold tracking-tight text-center lg:text-left">
          <TypingTitle text="WeatherToWear" highlight="ToWear" />
        </h1>
        <img src="/logo.png" alt="Logo" className="max-w-[200px] sm:max-w-[280px]" />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white dark:bg-gray-800 p-6 sm:p-8">
        <form onSubmit={handleLogin} className="w-full max-w-sm sm:max-w-md">
          <h2 className="text-3xl font-light mb-4 text-center lg:text-left text-black dark:text-gray-100">
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
  );
}
