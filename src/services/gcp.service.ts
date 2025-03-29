import { Compute } from '@google-cloud/compute';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger.service';
import { gcpConfig } from '../config/gcp';
import { guacamoleService } from './guacamole.service';
import { sessionService } from './session.service';

const prisma = new PrismaClient();
const compute = new Compute({
  projectId: gcpConfig.projectId,
  keyFilename: gcpConfig.keyFilePath
});

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return getErrorMessage(error);
    return String(error);
  }

export const gcpService = {
  // Provision a VM asynchronously
  async provisionVMAsync(sessionId: string, osType: string) {
    try {
      // Update session status to provisioning
      await sessionService.updateSessionStatus(sessionId, 'provisioning');
      
      // Provision VM
      const result = await this.provisionVM(sessionId, osType);
      
      // Update session with VM details
      await prisma.labSession.update({
        where: { id: sessionId },
        data: {
          instanceId: result.vmName,
          guacamoleConnectionId: result.connectionId,
          status: 'running'
        }
      });
      
      // Log successful provisioning
      await sessionService.logSessionActivity(
        sessionId, 
        'provisioned', 
        `VM ${result.vmName} provisioned with IP ${result.ipAddress}`
      );
      
      return result;
    } catch (error) {
      logger.error(`Failed to provision VM for session ${sessionId}: ${getErrorMessage(error)}`);
      
      // Update session status to error
      await sessionService.updateSessionStatus(sessionId, 'error');
      
      // Log error
      await sessionService.logSessionActivity(
        sessionId,
        'error',
        `Failed to provision VM: ${getErrorMessage(error)}`
      );
      
      throw error;
    }
  },
  
  // Provision a VM
  async provisionVM(sessionId: string, osType: string) {
    // Get the appropriate template based on OS type
    const templateName = this.getTemplateForOS(osType);
    
    // Create a unique VM name
    const vmName = `lab-${osType.toLowerCase().replace(' ', '-')}-${sessionId.substring(0, 8)}`;
    
    // Create the VM from template
    const zone = compute.zone(gcpConfig.zone);
    const [vm, operation] = await zone.createVM(vmName, {
      sourceInstanceTemplate: `projects/${gcpConfig.projectId}/global/instanceTemplates/${templateName}`,
      scheduling: {
        preemptible: true,
        automaticRestart: false
      },
      metadata: {
        items: [
          { key: 'sessionId', value: sessionId }
        ]
      }
    });
    
    // Wait for VM creation to complete
    await operation.promise();
    
    // Get VM details
    const [metadata] = await vm.getMetadata();
    const networkInterfaces = metadata.networkInterfaces || [];
    
    if (!networkInterfaces.length || !networkInterfaces[0].accessConfigs || !networkInterfaces[0].accessConfigs.length) {
        throw new Error('VM created but no external IP assigned');
      }
      
      const ipAddress = networkInterfaces[0].accessConfigs[0].natIP;
      
      // Wait for VM to be fully booted and services to start
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      // Create Guacamole connection for this VM
      const connectionId = await guacamoleService.createConnection(ipAddress, osType);
      
      return {
        vmName,
        ipAddress,
        connectionId
      };
    },
    
    // Terminate a VM
    async terminateVM(sessionId: string) {
      try {
        // Get session details
        const session = await prisma.labSession.findUnique({
          where: { id: sessionId }
        });
        
        if (!session || !session.instanceId) {
          throw new Error('Session not found or no VM associated');
        }
        
        // Delete the VM
        const zone = compute.zone(gcpConfig.zone);
        const vm = zone.vm(session.instanceId);
        const [operation] = await vm.delete();
        
        // Wait for deletion to complete
        await operation.promise();
        
        // Delete Guacamole connection if exists
        if (session.guacamoleConnectionId) {
          await guacamoleService.deleteConnection(session.guacamoleConnectionId);
        }
        
        // Update session status
        await prisma.labSession.update({
          where: { id: sessionId },
          data: {
            status: 'terminated',
            endTime: new Date()
          }
        });
        
        // Log termination
        await sessionService.logSessionActivity(
          sessionId,
          'terminated',
          `VM ${session.instanceId} terminated`
        );
        
        return true;
      } catch (error) {
        logger.error(`Failed to terminate VM for session ${sessionId}: ${getErrorMessage(error)}`);
        throw new Error('Failed to terminate lab environment');
      }
    },
    
    // Helper function to get template name based on OS type
    getTemplateForOS(osType: string): string {
      switch (osType) {
        case 'Ubuntu':
          return 'ubuntu-template';
        case 'Rocky Linux':
          return 'rocky-linux-template';
        case 'OpenSUSE':
          return 'opensuse-template';
        default:
          return 'ubuntu-template';
      }
    }
  };
  