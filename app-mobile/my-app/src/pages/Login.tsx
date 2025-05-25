import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'user' && password === '1234') {
      navigate('/dashboard');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ✅ Logo section comes first to appear on top for mobile */}
      <div className="w-full lg:w-1/2 bg-black flex flex-col items-center justify-center p-6 sm:p-8">
        <h1 className="text-white text-3xl sm:text-4xl mb-4 font-bodoni tracking-wide text-center">
          Weather2Wear
        </h1>
        <img src="/logo.png" alt="Logo" className="max-w-[200px] sm:max-w-[280px]" />
      </div>

      {/* Form section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 sm:p-8">
        <form onSubmit={handleLogin} className="w-full max-w-sm sm:max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center lg:text-left">Login</h2>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mb-4 px-4 py-2 rounded-full bg-gray-100"
            required
          />

          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-full bg-gray-100"
              required
            />
            <img
              src={showPassword ? "/eye_closed.png" : "/eye.png"}
              alt="Toggle visibility"
              className="w-5 h-5 absolute top-2.5 right-4 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>

          <button type="submit" className="w-full bg-[#3F978F] text-white py-2 rounded-full mb-3">
            Login
          </button>

          <p className="text-sm text-gray-700 text-center">
            Don’t have an account yet?{" "}
            <Link to="/signup" className="text-[#3F978F] underline">Signup?</Link>
          </p>
        </form>
      </div>
    </div>
  );
}