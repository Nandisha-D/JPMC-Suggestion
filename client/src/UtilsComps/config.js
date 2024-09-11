// config.js
const USE_LOCAL_SERVER = true; // Set to false for deployment server

const CONFIG = {
  WEBSOCKET_URL: USE_LOCAL_SERVER
    ? "ws://localhost:8000/ws/test/"
    : "wss://deployment-server-url/ws/test/", // Replace with actual deployment server URL
  HTTP_URL: USE_LOCAL_SERVER
    ? "http://localhost:8000/api/test"
    : "https://deployment-server-url/api/", // Replace with actual deployment server URL
};

export default CONFIG;
