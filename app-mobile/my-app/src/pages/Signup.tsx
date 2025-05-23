import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TypingTitle from '../components/TypingTitle';

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', username: '',
    password: '', confirmPassword: '', age: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Mock signup complete');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="w-full lg:w-1/2 bg-black flex flex-col items-center justify-center p-6 sm:p-8">
        <h1 className="text-white text-4xl sm:text-4xl mb-4 font-bodoni tracking-wide text-center lg:text-left">
          <TypingTitle text="Weather2Wear" highlight="Wear" />
        </h1>
        <img src="/logo.png" alt="Logo" className="max-w-[200px] sm:max-w-[280px]" />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-6 sm:p-8">




 <form onSubmit={handleSubmit} className="w-full max-w-md">
  <h2 className="text-3xl font-light mb-6 text-center lg:text-left">Sign up</h2>

  <div className="mb-4">
    <input
      name="username"
      placeholder="Username"
      onChange={handleChange}
      className="w-full px-4 py-2 rounded-full bg-white border border-black"
      required
    />
  </div>

  <div className="mb-4">
    <input
      name="email"
      placeholder="Email"
      onChange={handleChange}
      className="w-full px-4 py-2 rounded-full bg-white border border-black"
      required
    />
  </div>

  <div className="relative mb-4">
    <input
      type={showPassword ? "text" : "password"}
      name="password"
      placeholder="Password"
      onChange={handleChange}
      className="w-full px-4 py-2 rounded-full bg-white border border-black"
      required
    />
    <img
      src={showPassword ? "/eye_closed.png" : "/eye.png"}
      alt="Toggle"
      className="w-5 h-5 absolute top-2.5 right-4 cursor-pointer"
      onClick={() => setShowPassword(!showPassword)}
    />
  </div>

  <div className="relative mb-4">
    <input
      type={showConfirm ? "text" : "password"}
      name="confirmPassword"
      placeholder="Confirm Password"
      onChange={handleChange}
      className="w-full px-4 py-2 rounded-full bg-white border border-black"
      required
    />
    <img
      src={showConfirm ? "/eye_closed.png" : "/eye.png"}
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

  <p className="text-sm text-gray-700 text-center">
    Go back to <Link to="/login" className="text-[#3F978F] underline">Login?</Link>
  </p>
</form>








      </div>
    </div>
  );
}
