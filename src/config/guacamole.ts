export const guacamoleConfig = {
    baseUrl: process.env.GUACAMOLE_URL || 'http://localhost:8080/guacamole',
    username: process.env.GUACAMOLE_USERNAME || 'guacadmin',
    password: process.env.GUACAMOLE_PASSWORD || 'guacadmin',
    vncPassword: process.env.VNC_PASSWORD || 'password',
    secret: process.env.GUACAMOLE_SECRET || 'unnati-secret-key'
  };
  