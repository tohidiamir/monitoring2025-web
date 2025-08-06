/**
 * Utility functions for handling PLC register data
 */

/**
 * Check if a register contains pressure or temperature data
 * @param register - The register identifier (e.g., 'D500')
 * @param label - The English label for the register
 * @param labelFa - The Persian label for the register
 * @returns true if the register contains pressure or temperature data
 */
export function isPressureOrTemperatureRegister(
  register: string, 
  label?: string, 
  labelFa?: string
): boolean {
  // Check Persian labels
  if (labelFa) {
    const persianLabel = labelFa.toLowerCase();
    if (persianLabel.includes('فشار') || persianLabel.includes('دما')) {
      return true;
    }
  }
  
  // Check English labels
  if (label) {
    const englishLabel = label.toLowerCase();
    if (englishLabel.includes('pressure') || englishLabel.includes('temputare') || englishLabel.includes('temp')) {
      return true;
    }
  }
  
  // Check register names directly (pressure and temperature registers)
  const pressureTemperatureRegisters = [
    'D500', 'D501', 'D502', 'D503', 'D504', 'D505', 'D506', 'D507', 'D508',
    'D513', 'D514', 'D515', 'D516'
  ];
  
  return pressureTemperatureRegisters.includes(register);
}

/**
 * Apply 0.1 multiplier to pressure and temperature values
 * @param value - The raw value from PLC
 * @param register - The register identifier
 * @param label - The English label
 * @param labelFa - The Persian label
 * @returns The processed value (with 0.1 multiplier applied if needed)
 */
export function applyPressureTemperatureMultiplier(
  value: any,
  register: string,
  label?: string,
  labelFa?: string
): number | string {
  if (value === null || value === undefined || value === 'N/A') {
    return 'N/A';
  }
  
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return value;
  }
  
  if (isPressureOrTemperatureRegister(register, label, labelFa)) {
    return numValue * 0.1;
  }
  
  return numValue;
}

/**
 * Check if a register is a main temperature or pressure register that should be shown in charts
 * @param register - The register identifier (e.g., 'D500')
 * @param label - The English label for the register
 * @param labelFa - The Persian label for the register
 * @returns true if the register should be shown in charts
 */
export function isMainTemperaturePressureRegister(
  register: string, 
  label?: string, 
  labelFa?: string
): boolean {
  // Main temperature and pressure registers only
  const mainRegisters = [
    'D500', // فشار اصلی (Main Pressure)
    'D501', // دما اصلی (Main Temperature) 
    'D502', // دما 1 (Temperature 1)
    'D503', // دما 2 (Temperature 2)
    'D504', // دما 3 (Temperature 3)
    'D505', // دما 4 (Temperature 4)
  ];
  
  return mainRegisters.includes(register);
}

/**
 * Format a value for display, applying appropriate decimal places
 * @param value - The value to format
 * @param register - The register identifier
 * @param label - The English label
 * @param labelFa - The Persian label
 * @returns Formatted string for display
 */
export function formatRegisterValue(
  value: any,
  register: string,
  label?: string,
  labelFa?: string
): string {
  if (value === null || value === undefined || value === 'N/A') {
    return 'N/A';
  }
  
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return String(value);
  }
  
  if (isPressureOrTemperatureRegister(register, label, labelFa)) {
    // Show 1 decimal place for pressure and temperature only
    return numValue.toLocaleString('fa-IR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
  }
  
  // For time and other values, show without decimals as integers
  return Math.round(numValue).toLocaleString('fa-IR');
}
