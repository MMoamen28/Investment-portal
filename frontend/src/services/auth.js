import api from './api';

export const login    = (creds) => api.post('/auth/login', creds);
export const register = (data)  => api.post('/auth/register', data);
