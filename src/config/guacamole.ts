export const guacamoleConfig = {
    baseUrl: process.env.GUACAMOLE_URL || 'http://localhost:8080/guacamole',
    username: process.env.GUACAMOLE_USERNAME || 'guacadmin',
    password: process.env.GUACAMOLE_PASSWORD || 'guacadmin',
    secret: process.env.GUACAMOLE_SECRET || 'unnati-secret-key'
  };
  