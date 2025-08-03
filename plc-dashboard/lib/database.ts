import sql from 'mssql';

// Database configuration using tedious driver
const dbConfig: sql.config = {
   user: 'amir',
  password: 'sirabi',
  server: 'localhost',
  database: 'PLCMonitoring',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getDbConnection() {
  if (!pool) {
    try {
      console.log('🔗 Attempting to connect to SQL Server...');
      console.log('Config:', {
        server: dbConfig.server,
        database: dbConfig.database,
        driver: dbConfig.driver,
        options: dbConfig.options,
      });

      pool = new sql.ConnectionPool(dbConfig);
      await pool.connect();
      console.log('✅ Connected to SQL Server database: PLCMonitoring');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      console.error('🔍 Detailed Error:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
      pool = null;
      throw error;
    }
  }
  return pool;
}

export async function closeDbConnection() {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      console.log('📴 Database connection closed');
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  }
}

// PLC Configuration - same as Python server
export const PLC_CONFIG = [
  {
    id: 1,
    name: 'PLC_01',
    slave_address: 1,
    registers: {
      start_address: 4596,
      end_address: 4645,
      count: 50,
    },
    database_registers: [
      { register: 'D500', label: 'Pressure', description: 'Main Pressure Sensor' },
      { register: 'D501', label: 'Pressure_min', description: 'Condition Min Pressure' },
      { register: 'D502', label: 'Temputare_main', description: 'Main Temputare Sensor' },
      { register: 'D503', label: 'Temputare_1', description: 'Temputare 1 Sensor' },
      { register: 'D504', label: 'Temputare_2', description: 'Temputare 2 Sensor' },
      { register: 'D505', label: 'Temputare_3', description: 'Temputare 3 Sensor' },
      { register: 'D506', label: 'Temputare_4', description: 'Temputare 4 Sensor' },
      { register: 'D507', label: 'Temputare_min', description: 'Condition Min Temputare' },
      { register: 'D508', label: 'Temputare_max', description: 'Condition Max Temputare' },
      { register: 'D513', label: 'Temputare_Calibre_1', description: 'Calibrated Temputare 1' },
      { register: 'D514', label: 'Temputare_Calibre_2', description: 'Calibrated Temputare 2' },
      { register: 'D515', label: 'Temputare_Calibre_3', description: 'Calibrated Temputare 3' },
    ],
  },
  {
    id: 2,
    name: 'PLC_02',
    slave_address: 2,
    registers: {
      start_address: 4596,
      end_address: 4645,
      count: 50,
    },
    database_registers: [
      { register: 'D500', label: 'Pressure', description: 'Main Pressure Sensor' },
      { register: 'D501', label: 'Pressure_min', description: 'Condition Min Pressure' },
      { register: 'D502', label: 'Temputare_main', description: 'Main Temputare Sensor' },
      { register: 'D503', label: 'Temputare_1', description: 'Temputare 1 Sensor' },
      { register: 'D504', label: 'Temputare_2', description: 'Temputare 2 Sensor' },
      { register: 'D505', label: 'Temputare_3', description: 'Temputare 3 Sensor' },
      { register: 'D506', label: 'Temputare_4', description: 'Temputare 4 Sensor' },
      { register: 'D507', label: 'Temputare_min', description: 'Condition Min Temputare' },
      { register: 'D508', label: 'Temputare_max', description: 'Condition Max Temputare' },
      { register: 'D513', label: 'Temputare_Calibre_1', description: 'Calibrated Temputare 1' },
      { register: 'D514', label: 'Temputare_Calibre_2', description: 'Calibrated Temputare 2' },
      { register: 'D515', label: 'Temputare_Calibre_3', description: 'Calibrated Temputare 3' },
    ],
  },
];

export const DATABASE_CONFIG = {
  server: 'localhost',
  database: 'PLCMonitoring',
  table_prefix: 'PLC_Data_',
};
