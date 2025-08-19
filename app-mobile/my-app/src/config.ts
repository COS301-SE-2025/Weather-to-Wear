// CRA exposes env only if prefixed with REACT_APP_
export const API_BASE =
  process.env.REACT_APP_API_BASE || 'http://localhost:5001';
