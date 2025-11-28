// api.js
import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.gogo-digital.com';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',  // Force JSON
  },
  // This is the key: Axios will now ALWAYS stringify objects as JSON
  transformRequest: [
    (data, headers) => {
      // Only transform if it's a plain object and not FormData
      if (data && typeof data === 'object' && !(data instanceof FormData)) {
        return JSON.stringify(data);
      }
      return data;
    }
  ].concat(axios.defaults.transformRequest || []),
});

export default api;