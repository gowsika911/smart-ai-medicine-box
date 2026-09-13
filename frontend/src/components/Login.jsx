import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);
    setApiError('');

    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const response = await axiosInstance.post('/auth/login', {
        email,
        password,
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      alert('Login successful! Welcome back ' + user.name);
      // TODO: redirect to dashboard once routing is added
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed. Check your credentials.';
      setApiError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      {apiError && <p className="error-text">{apiError}</p>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
          {errors.email && <p className="error-text">{errors.email}</p>}
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
          {errors.password && <p className="error-text">{errors.password}</p>}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

export default Login;
