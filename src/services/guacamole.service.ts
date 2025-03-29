import axios from 'axios';
import { createHmac } from 'crypto';
import { logger } from './logger.service';
import { guacamoleConfig } from '../config/guacamole';

export const guacamoleService = {
  // Get authentication token for Guacamole API
  async getAuthToken() {
    try {
      const response = await axios.post(
        `${guacamoleConfig.baseUrl}/api/tokens`,
        null,
        {
          params: {
            username: guacamoleConfig.username,
            password: guacamoleConfig.password
          }
        }
      );
      
      return response.data.authToken;
    } catch (error) {
      logger.error(`Failed to get Guacamole auth token: ${error.message}`);
      throw new Error('Failed to authenticate with Guacamole');
    }
  },
  
  // Create a new connection in Guacamole
  async createConnection(vmIp: string, osType: string) {
    try {
      const authToken = await this.getAuthToken();
      
      // Define connection parameters based on OS type
      const protocol = 'vnc';
      const port = '5901';
      
      const connectionParams = {
        name: `${osType}-${Date.now()}`,
        parentIdentifier: 'ROOT',
        protocol,
        parameters: {
          hostname: vmIp,
          port,
          password: guacamoleConfig.vncPassword,
          'security': 'none',
          'ignore-cert': 'true'
        },
        attributes: {
          'max-connections': '1',
          'max-connections-per-user': '1'
        }
      };
      
      // Create connection
      const response = await axios.post(
        `${guacamoleConfig.baseUrl}/api/session/data/postgresql/connections`,
        connectionParams,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      return response.data.identifier;
    } catch (error) {
      logger.error(`Failed to create Guacamole connection: ${error.message}`);
      throw new Error('Failed to create remote desktop connection');
    }
  },
  
  // Generate client URL for a connection
  generateClientUrl(connectionId: string) {
    // Create a signed token for the connection
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', guacamoleConfig.secret)
      .update(`${connectionId}${timestamp}`)
      .digest('hex');
    
    return `${guacamoleConfig.baseUrl}/#/client/${connectionId}?token=${signature}&timestamp=${timestamp}`;
  },
  
  // Delete a connection
  async deleteConnection(connectionId: string) {
    try {
      const authToken = await this.getAuthToken();
      
      await axios.delete(
        `${guacamoleConfig.baseUrl}/api/session/data/postgresql/connections/${connectionId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      return true;
    } catch (error) {
      logger.error(`Failed to delete Guacamole connection: ${error.message}`);
      throw new Error('Failed to clean up remote desktop connection');
    }
  }
};
