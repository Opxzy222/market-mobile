import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.gogo-digital.com';

const api = axios.create({
  baseURL: BASE_URL,
});

export default api;