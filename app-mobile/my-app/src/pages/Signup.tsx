// src/pages/Signup.tsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TypingTitle from '../components/TypingTitle';
import { signupUser } from '../services/auth';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    const newErrors: string[] = [];
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(formData.email)) {
      newErrors.push('Please enter a valid email address.');
    }
    const passRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    if (!passRegex.test(formData.password)) {
      newErrors.push(
        'Password must be at least 8 characters and include lowercase, uppercase, and a special character.'
      );
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.push("Passwords don't match.");
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const res = await signupUser(
        formData.username,
        formData.email,
        formData.password
      );
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      navigate('/dashboard');
    } catch (err: any) {
      setErrors([err.message || 'Signup failed.']);
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
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <h2 className="text-3xl font-light mb-6 text-center lg:text-left dark:text-gray-100">
            Sign up
          </h2>

          {/* Error Popup */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 border-l-4 border-rose-500 dark:border-rose-300 rounded-lg shadow-md animate-fade-in">
              {errors.map((err, idx) => (
                <div
                  key={idx}
                  className="flex items-center text-rose-600 dark:text-rose-300 text-sm font-medium mb-2 last:mb-0"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mb-4">
            <input
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-full bg-white dark:bg-gray-700 border border-black dark:border-gray-600 text-gray-900 dark:text-gray-200"
              required
            />
          </div>

          <div className="mb-4">
            <input
              name="email"
              placeholder="Email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-full bg-white dark:bg-gray-700 border border-black dark:border-gray-600 text-gray-900 dark:text-gray-200"
              required
            />
          </div>

          <div className="relative mb-4">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-full bg-white dark:bg-gray-700 border border-black dark:border-gray-600 text-gray-900 dark:text-gray-200"
              required
            />
            <img
              src={showPassword ? '/eye_closed.png' : '/eye.png'}
              alt="Toggle"
              className="w-5 h-5 absolute top-2.5 right-4 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>

          <div className="relative mb-4">
            <input
              type={showConfirm ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-full bg-white dark:bg-gray-700 border border-black dark:border-gray-600 text-gray-900 dark:text-gray-200"
              required
            />
            <img
              src={showConfirm ? '/eye_closed.png' : '/eye.png'}
              alt="Toggle"
              className="w-5 h-5 absolute top-2.5 right-4 cursor-pointer"
              onClick={() => setShowConfirm(!showConfirm)}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#3F978F] hover:bg-[#2c716c] text-white py-2 rounded-full mb-2 transition-colors duration-200"
          >
            Sign up
          </button>

          <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
            Go back to{' '}
            <Link to="/login" className="text-[#3F978F] underline">
              Login?
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
