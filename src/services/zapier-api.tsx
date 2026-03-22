import axios from 'axios';

const zapierApiUrl = 'https://api.zapier.com/v1/';
const zapierApiKey = 'YOUR_ZAPIER_API_KEY';

const zapierApi = axios.create({
  baseURL: zapierApiUrl,
  headers: {
    'Authorization': `Bearer ${zapierApiKey}`,
  },
});

export default zapierApi;