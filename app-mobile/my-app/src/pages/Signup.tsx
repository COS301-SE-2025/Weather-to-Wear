import React, { useState } from 'react';
import { Link } from 'react-router-dom';

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
    <div className="min-h-screen flex">
      {/* LEFT: Logo + Title */}
      <div className="w-1/2 bg-black flex flex-col items-center justify-center p-8">
        <h1 className="text-white text-3xl md:text-4xl mb-4 font-bodoni tracking-wide">
          Weather2Wear
        </h1>
        <img src="/logo.png" alt="Logo" className="max-w-[300px]" />
      </div>

      {/* RIGHT: Form */}
      <div className="w-1/2 flex items-center justify-center bg-white p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6">Sign up</h2>

          <div className="flex gap-2 mb-4">
            <input name="firstName" placeholder="First Name" onChange={handleChange} className="w-1/2 px-4 py-2 rounded-full bg-gray-100" required />
            <input name="lastName" placeholder="Last Name" onChange={handleChange} className="w-1/2 px-4 py-2 rounded-full bg-gray-100" required />
          </div>

          <input name="username" placeholder="Username" onChange={handleChange} className="w-full mb-4 px-4 py-2 rounded-full bg-gray-100" required />

          <div className="relative mb-4">
            <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" onChange={handleChange} className="w-full px-4 py-2 rounded-full bg-gray-100" required />
            <img src={showPassword ? "/eye_closed.png" : "/eye.png"} alt="Toggle" className="w-5 h-5 absolute top-2.5 right-4 cursor-pointer" onClick={() => setShowPassword(!showPassword)} />
          </div>

          <div className="relative mb-4">
            <input type={showConfirm ? "text" : "password"} name="confirmPassword" placeholder="Confirm Password" onChange={handleChange} className="w-full px-4 py-2 rounded-full bg-gray-100" required />
            <img src={showConfirm ? "/eye_closed.png" : "/eye.png"} alt="Toggle" className="w-5 h-5 absolute top-2.5 right-4 cursor-pointer" onClick={() => setShowConfirm(!showConfirm)} />
          </div>

          <div className="relative mb-6">
            <select
              name="age"
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-full bg-gray-100 appearance-none pr-10"
              required
            >
              <option value="">Age</option>
              {[...Array(60)].map((_, i) => (
                <option key={i} value={i + 13}>{i + 13}</option>
              ))}
            </select>
            <img
              src="/arrow.png"
              alt="Arrow"
              className="w-4 h-4 absolute top-3.5 right-4 pointer-events-none"
            />
          </div>

          <button type="submit" className="w-full bg-[#3F978F] text-white py-2 rounded-full mb-2">
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
