import dotenv from 'dotenv';
import { Config } from '../types';

dotenv.config();

function getVulnerabilityFlag(flagName: string, defaultValue: boolean = true): boolean {
  const value = process.env[flagName];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function getSafeModeVulnerabilityFlag(flagName: string): boolean {
  const safeMode = process.env.SAFE_MODE === 'true';
  const originalValue = getVulnerabilityFlag(flagName, true);
  
  // In safe mode, invert all vulnerability flags
  return safeMode ? !originalValue : originalValue;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-weak-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: process.env.DATABASE_URL || 'file:./yogastore.db',
  logLevel: process.env.LOG_LEVEL || 'info',
  vulnerabilities: {
    api1Bola: getSafeModeVulnerabilityFlag('VULN_API1_BOLA'),
    api2BrokenAuth: getSafeModeVulnerabilityFlag('VULN_API2_BROKEN_AUTH'),
    api3Bopla: getSafeModeVulnerabilityFlag('VULN_API3_BOPLA'),
    api4Resource: getSafeModeVulnerabilityFlag('VULN_API4_RESOURCE'),
    api5FuncAuth: getSafeModeVulnerabilityFlag('VULN_API5_FUNC_AUTH'),
    api6BusinessFlow: getSafeModeVulnerabilityFlag('VULN_API6_BUSINESS_FLOW'),
    api7Ssrf: getSafeModeVulnerabilityFlag('VULN_API7_SSRF'),
    api8Misconfig: getSafeModeVulnerabilityFlag('VULN_API8_MISCONFIG'),
    api9Inventory: getSafeModeVulnerabilityFlag('VULN_API9_INVENTORY'),
    api10UnsafeConsump: getSafeModeVulnerabilityFlag('VULN_API10_UNSAFE_CONSUMP'),
  },
  safeMode: process.env.SAFE_MODE === 'true',
};

export function logVulnerabilityStatus(): void {
  console.log('\n🔓 VulnYoga Vulnerability Status:');
  console.log('=====================================');
  
  Object.entries(config.vulnerabilities).forEach(([key, value]) => {
    const status = value ? '🔴 VULNERABLE' : '🟢 SECURE';
    const apiNumber = key.replace('api', 'API').replace('Bola', '1_BOLA')
      .replace('BrokenAuth', '2_BROKEN_AUTH')
      .replace('Bopla', '3_BOPLA')
      .replace('Resource', '4_RESOURCE')
      .replace('FuncAuth', '5_FUNC_AUTH')
      .replace('BusinessFlow', '6_BUSINESS_FLOW')
      .replace('Ssrf', '7_SSRF')
      .replace('Misconfig', '8_MISCONFIG')
      .replace('Inventory', '9_INVENTORY')
      .replace('UnsafeConsump', '10_UNSAFE_CONSUMP');
    
    console.log(`${status} - ${apiNumber}`);
  });
  
  if (config.safeMode) {
    console.log('\n🛡️  SAFE MODE ENABLED - All vulnerabilities disabled');
  }
  
  console.log('=====================================\n');
}
