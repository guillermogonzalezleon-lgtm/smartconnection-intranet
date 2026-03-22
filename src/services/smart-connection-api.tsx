import axios from 'axios';

const smartConnectionApiUrl = 'https://api.smartconnection.com/v1/';
const smartConnectionApiKey = 'YOUR_SMART_CONNECTION_API_KEY';

const smartConnectionApi = axios.create({
  baseURL: smartConnectionApiUrl,
  headers: {
    'Authorization': `Bearer ${smartConnectionApiKey}`,
  },
});

export default smartConnectionApi;