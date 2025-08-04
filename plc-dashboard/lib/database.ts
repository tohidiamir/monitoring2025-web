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
    displayName: 'اتوکلاو 01',
    slave_address: 1,
    registers: {
      start_address: 4596,
      end_address: 4645,
      count: 50,
    },
    database_registers: [
      { register: 'D500', label: 'Pressure', labelFa: 'فشار', description: 'Main Pressure Sensor', descriptionFa: 'سنسور فشار اصلی' },
      { register: 'D501', label: 'Pressure_min', labelFa: 'حداقل فشار', description: 'Condition Min Pressure', descriptionFa: 'حداقل فشار مجاز' },
      { register: 'D502', label: 'Temputare_main', labelFa: 'دمای اصلی', description: 'Main Temputare Sensor', descriptionFa: 'سنسور دمای اصلی' },
      { register: 'D503', label: 'Temputare_1', labelFa: 'دمای ۱', description: 'Temputare 1 Sensor', descriptionFa: 'سنسور دمای شماره ۱' },
      { register: 'D504', label: 'Temputare_2', labelFa: 'دمای ۲', description: 'Temputare 2 Sensor', descriptionFa: 'سنسور دمای شماره ۲' },
      { register: 'D505', label: 'Temputare_3', labelFa: 'دمای ۳', description: 'Temputare 3 Sensor', descriptionFa: 'سنسور دمای شماره ۳' },
      { register: 'D506', label: 'Temputare_4', labelFa: 'دمای ۴', description: 'Temputare 4 Sensor', descriptionFa: 'سنسور دمای شماره ۴' },
      { register: 'D507', label: 'Temputare_min', labelFa: 'حداقل دما', description: 'Condition Min Temputare', descriptionFa: 'حداقل دمای مجاز' },
      { register: 'D508', label: 'Temputare_max', labelFa: 'حداکثر دما', description: 'Condition Max Temputare', descriptionFa: 'حداکثر دمای مجاز' },
      { register: 'D513', label: 'Temputare_Calibre_1', labelFa: 'دمای کالیبره ۱', description: 'Calibrated Temputare 1', descriptionFa: 'دمای کالیبره شده ۱' },
      { register: 'D514', label: 'Temputare_Calibre_2', labelFa: 'دمای کالیبره ۲', description: 'Calibrated Temputare 2', descriptionFa: 'دمای کالیبره شده ۲' },
      { register: 'D515', label: 'Temputare_Calibre_3', labelFa: 'دمای کالیبره ۳', description: 'Calibrated Temputare 3', descriptionFa: 'دمای کالیبره شده ۳' },
      { register: 'D516', label: 'Temputare_Calibre_4', labelFa: 'دمای کالیبره ۴', description: 'Calibrated Temputare 4', descriptionFa: 'دمای کالیبره شده ۴' },
      { register: 'D520', label: 'Time_Main', labelFa: 'زمان اصلی', description: 'Time Minute Check', descriptionFa: 'بررسی زمان به دقیقه' },
      { register: 'D521', label: 'Time_Minute_Run', labelFa: 'زمان اجرا', description: 'Time Run Check', descriptionFa: 'بررسی زمان اجرا' },
      { register: 'D522', label: 'Time_Second_Run', labelFa: 'ثانیه اجرا', description: 'Time Second Check', descriptionFa: 'بررسی زمان به ثانیه' },
      { register: 'D525', label: 'GREEN', labelFa: 'چراغ سبز', description: 'RUN AUTOCLAV', descriptionFa: 'اجرای اتوکلاو' },
      { register: 'D526', label: 'RED', labelFa: 'چراغ قرمز', description: 'TEMP AUTOCLAV ERROR', descriptionFa: 'خطای دمای اتوکلاو' },
      { register: 'D527', label: 'YELLOW', labelFa: 'چراغ زرد', description: 'TIMER ZERO', descriptionFa: 'صفر شدن تایمر' },
    ],
  },
  {
    id: 2,
    name: 'PLC_02',
    displayName: 'اتوکلاو 02',
    slave_address: 2,
    registers: {
      start_address: 4596,
      end_address: 4645,
      count: 50,
    },
    database_registers: [
      { register: 'D500', label: 'Pressure', labelFa: 'فشار', description: 'Main Pressure Sensor', descriptionFa: 'سنسور فشار اصلی' },
      { register: 'D501', label: 'Pressure_min', labelFa: 'حداقل فشار', description: 'Condition Min Pressure', descriptionFa: 'حداقل فشار مجاز' },
      { register: 'D502', label: 'Temputare_main', labelFa: 'دمای اصلی', description: 'Main Temputare Sensor', descriptionFa: 'سنسور دمای اصلی' },
      { register: 'D503', label: 'Temputare_1', labelFa: 'دمای ۱', description: 'Temputare 1 Sensor', descriptionFa: 'سنسور دمای شماره ۱' },
      { register: 'D504', label: 'Temputare_2', labelFa: 'دمای ۲', description: 'Temputare 2 Sensor', descriptionFa: 'سنسور دمای شماره ۲' },
      { register: 'D505', label: 'Temputare_3', labelFa: 'دمای ۳', description: 'Temputare 3 Sensor', descriptionFa: 'سنسور دمای شماره ۳' },
      { register: 'D506', label: 'Temputare_4', labelFa: 'دمای ۴', description: 'Temputare 4 Sensor', descriptionFa: 'سنسور دمای شماره ۴' },
      { register: 'D507', label: 'Temputare_min', labelFa: 'حداقل دما', description: 'Condition Min Temputare', descriptionFa: 'حداقل دمای مجاز' },
      { register: 'D508', label: 'Temputare_max', labelFa: 'حداکثر دما', description: 'Condition Max Temputare', descriptionFa: 'حداکثر دمای مجاز' },
      { register: 'D513', label: 'Temputare_Calibre_1', labelFa: 'دمای کالیبره ۱', description: 'Calibrated Temputare 1', descriptionFa: 'دمای کالیبره شده ۱' },
      { register: 'D514', label: 'Temputare_Calibre_2', labelFa: 'دمای کالیبره ۲', description: 'Calibrated Temputare 2', descriptionFa: 'دمای کالیبره شده ۲' },
      { register: 'D515', label: 'Temputare_Calibre_3', labelFa: 'دمای کالیبره ۳', description: 'Calibrated Temputare 3', descriptionFa: 'دمای کالیبره شده ۳' },
      { register: 'D516', label: 'Temputare_Calibre_4', labelFa: 'دمای کالیبره ۴', description: 'Calibrated Temputare 4', descriptionFa: 'دمای کالیبره شده ۴' },
      { register: 'D520', label: 'Time_Main', labelFa: 'زمان اصلی', description: 'Time Minute Check', descriptionFa: 'بررسی زمان به دقیقه' },
      { register: 'D521', label: 'Time_Minute_Run', labelFa: 'زمان اجرا', description: 'Time Run Check', descriptionFa: 'بررسی زمان اجرا' },
      { register: 'D522', label: 'Time_Second_Run', labelFa: 'ثانیه اجرا', description: 'Time Second Check', descriptionFa: 'بررسی زمان به ثانیه' },
      { register: 'D525', label: 'GREEN', labelFa: 'چراغ سبز', description: 'RUN AUTOCLAV', descriptionFa: 'اجرای اتوکلاو' },
      { register: 'D526', label: 'RED', labelFa: 'چراغ قرمز', description: 'TEMP AUTOCLAV ERROR', descriptionFa: 'خطای دمای اتوکلاو' },
      { register: 'D527', label: 'YELLOW', labelFa: 'چراغ زرد', description: 'TIMER ZERO', descriptionFa: 'صفر شدن تایمر' },
    ],
  },
  {
    id: 3,
    name: 'PLC_03',
    displayName: 'اتوکلاو 03',
    slave_address: 3,
    registers: {
      start_address: 4596,
      end_address: 4645,
      count: 50,
    },
    database_registers: [
      { register: 'D500', label: 'Pressure', labelFa: 'فشار', description: 'Main Pressure Sensor', descriptionFa: 'سنسور فشار اصلی' },
      { register: 'D501', label: 'Pressure_min', labelFa: 'حداقل فشار', description: 'Condition Min Pressure', descriptionFa: 'حداقل فشار مجاز' },
      { register: 'D502', label: 'Temputare_main', labelFa: 'دمای اصلی', description: 'Main Temputare Sensor', descriptionFa: 'سنسور دمای اصلی' },
      { register: 'D503', label: 'Temputare_1', labelFa: 'دمای ۱', description: 'Temputare 1 Sensor', descriptionFa: 'سنسور دمای شماره ۱' },
      { register: 'D504', label: 'Temputare_2', labelFa: 'دمای ۲', description: 'Temputare 2 Sensor', descriptionFa: 'سنسور دمای شماره ۲' },
      { register: 'D505', label: 'Temputare_3', labelFa: 'دمای ۳', description: 'Temputare 3 Sensor', descriptionFa: 'سنسور دمای شماره ۳' },
      { register: 'D506', label: 'Temputare_4', labelFa: 'دمای ۴', description: 'Temputare 4 Sensor', descriptionFa: 'سنسور دمای شماره ۴' },
      { register: 'D507', label: 'Temputare_min', labelFa: 'حداقل دما', description: 'Condition Min Temputare', descriptionFa: 'حداقل دمای مجاز' },
      { register: 'D508', label: 'Temputare_max', labelFa: 'حداکثر دما', description: 'Condition Max Temputare', descriptionFa: 'حداکثر دمای مجاز' },
      { register: 'D513', label: 'Temputare_Calibre_1', labelFa: 'دمای کالیبره ۱', description: 'Calibrated Temputare 1', descriptionFa: 'دمای کالیبره شده ۱' },
      { register: 'D514', label: 'Temputare_Calibre_2', labelFa: 'دمای کالیبره ۲', description: 'Calibrated Temputare 2', descriptionFa: 'دمای کالیبره شده ۲' },
      { register: 'D515', label: 'Temputare_Calibre_3', labelFa: 'دمای کالیبره ۳', description: 'Calibrated Temputare 3', descriptionFa: 'دمای کالیبره شده ۳' },
      { register: 'D516', label: 'Temputare_Calibre_4', labelFa: 'دمای کالیبره ۴', description: 'Calibrated Temputare 4', descriptionFa: 'دمای کالیبره شده ۴' },
      { register: 'D520', label: 'Time_Main', labelFa: 'زمان اصلی', description: 'Time Minute Check', descriptionFa: 'بررسی زمان به دقیقه' },
      { register: 'D521', label: 'Time_Minute_Run', labelFa: 'زمان اجرا', description: 'Time Run Check', descriptionFa: 'بررسی زمان اجرا' },
      { register: 'D522', label: 'Time_Second_Run', labelFa: 'ثانیه اجرا', description: 'Time Second Check', descriptionFa: 'بررسی زمان به ثانیه' },
      { register: 'D525', label: 'GREEN', labelFa: 'چراغ سبز', description: 'RUN AUTOCLAV', descriptionFa: 'اجرای اتوکلاو' },
      { register: 'D526', label: 'RED', labelFa: 'چراغ قرمز', description: 'TEMP AUTOCLAV ERROR', descriptionFa: 'خطای دمای اتوکلاو' },
      { register: 'D527', label: 'YELLOW', labelFa: 'چراغ زرد', description: 'TIMER ZERO', descriptionFa: 'صفر شدن تایمر' },
    ],
  },
  {
    id: 4,
    name: 'PLC_04',
    displayName: 'اتوکلاو 04',
    slave_address: 4,
    registers: {
      start_address: 4596,
      end_address: 4645,
      count: 50,
    },
    database_registers: [
      { register: 'D500', label: 'Pressure', labelFa: 'فشار', description: 'Main Pressure Sensor', descriptionFa: 'سنسور فشار اصلی' },
      { register: 'D501', label: 'Pressure_min', labelFa: 'حداقل فشار', description: 'Condition Min Pressure', descriptionFa: 'حداقل فشار مجاز' },
      { register: 'D502', label: 'Temputare_main', labelFa: 'دمای اصلی', description: 'Main Temputare Sensor', descriptionFa: 'سنسور دمای اصلی' },
      { register: 'D503', label: 'Temputare_1', labelFa: 'دمای ۱', description: 'Temputare 1 Sensor', descriptionFa: 'سنسور دمای شماره ۱' },
      { register: 'D504', label: 'Temputare_2', labelFa: 'دمای ۲', description: 'Temputare 2 Sensor', descriptionFa: 'سنسور دمای شماره ۲' },
      { register: 'D505', label: 'Temputare_3', labelFa: 'دمای ۳', description: 'Temputare 3 Sensor', descriptionFa: 'سنسور دمای شماره ۳' },
      { register: 'D506', label: 'Temputare_4', labelFa: 'دمای ۴', description: 'Temputare 4 Sensor', descriptionFa: 'سنسور دمای شماره ۴' },
      { register: 'D507', label: 'Temputare_min', labelFa: 'حداقل دما', description: 'Condition Min Temputare', descriptionFa: 'حداقل دمای مجاز' },
      { register: 'D508', label: 'Temputare_max', labelFa: 'حداکثر دما', description: 'Condition Max Temputare', descriptionFa: 'حداکثر دمای مجاز' },
      { register: 'D513', label: 'Temputare_Calibre_1', labelFa: 'دمای کالیبره ۱', description: 'Calibrated Temputare 1', descriptionFa: 'دمای کالیبره شده ۱' },
      { register: 'D514', label: 'Temputare_Calibre_2', labelFa: 'دمای کالیبره ۲', description: 'Calibrated Temputare 2', descriptionFa: 'دمای کالیبره شده ۲' },
      { register: 'D515', label: 'Temputare_Calibre_3', labelFa: 'دمای کالیبره ۳', description: 'Calibrated Temputare 3', descriptionFa: 'دمای کالیبره شده ۳' },
      { register: 'D516', label: 'Temputare_Calibre_4', labelFa: 'دمای کالیبره ۴', description: 'Calibrated Temputare 4', descriptionFa: 'دمای کالیبره شده ۴' },
      { register: 'D520', label: 'Time_Main', labelFa: 'زمان اصلی', description: 'Time Minute Check', descriptionFa: 'بررسی زمان به دقیقه' },
      { register: 'D521', label: 'Time_Minute_Run', labelFa: 'زمان اجرا', description: 'Time Run Check', descriptionFa: 'بررسی زمان اجرا' },
      { register: 'D522', label: 'Time_Second_Run', labelFa: 'ثانیه اجرا', description: 'Time Second Check', descriptionFa: 'بررسی زمان به ثانیه' },
      { register: 'D525', label: 'GREEN', labelFa: 'چراغ سبز', description: 'RUN AUTOCLAV', descriptionFa: 'اجرای اتوکلاو' },
      { register: 'D526', label: 'RED', labelFa: 'چراغ قرمز', description: 'TEMP AUTOCLAV ERROR', descriptionFa: 'خطای دمای اتوکلاو' },
      { register: 'D527', label: 'YELLOW', labelFa: 'چراغ زرد', description: 'TIMER ZERO', descriptionFa: 'صفر شدن تایمر' },
    ],
  },
  {
    id: 5,
    name: 'PLC_05',
    displayName: 'اتوکلاو 05',
    slave_address: 5,
    registers: {
      start_address: 4596,
      end_address: 4645,
      count: 50,
    },
    database_registers: [
      { register: 'D500', label: 'Pressure', labelFa: 'فشار', description: 'Main Pressure Sensor', descriptionFa: 'سنسور فشار اصلی' },
      { register: 'D501', label: 'Pressure_min', labelFa: 'حداقل فشار', description: 'Condition Min Pressure', descriptionFa: 'حداقل فشار مجاز' },
      { register: 'D502', label: 'Temputare_main', labelFa: 'دمای اصلی', description: 'Main Temputare Sensor', descriptionFa: 'سنسور دمای اصلی' },
      { register: 'D503', label: 'Temputare_1', labelFa: 'دمای ۱', description: 'Temputare 1 Sensor', descriptionFa: 'سنسور دمای شماره ۱' },
      { register: 'D504', label: 'Temputare_2', labelFa: 'دمای ۲', description: 'Temputare 2 Sensor', descriptionFa: 'سنسور دمای شماره ۲' },
      { register: 'D505', label: 'Temputare_3', labelFa: 'دمای ۳', description: 'Temputare 3 Sensor', descriptionFa: 'سنسور دمای شماره ۳' },
      { register: 'D506', label: 'Temputare_4', labelFa: 'دمای ۴', description: 'Temputare 4 Sensor', descriptionFa: 'سنسور دمای شماره ۴' },
      { register: 'D507', label: 'Temputare_min', labelFa: 'حداقل دما', description: 'Condition Min Temputare', descriptionFa: 'حداقل دمای مجاز' },
      { register: 'D508', label: 'Temputare_max', labelFa: 'حداکثر دما', description: 'Condition Max Temputare', descriptionFa: 'حداکثر دمای مجاز' },
      { register: 'D513', label: 'Temputare_Calibre_1', labelFa: 'دمای کالیبره ۱', description: 'Calibrated Temputare 1', descriptionFa: 'دمای کالیبره شده ۱' },
      { register: 'D514', label: 'Temputare_Calibre_2', labelFa: 'دمای کالیبره ۲', description: 'Calibrated Temputare 2', descriptionFa: 'دمای کالیبره شده ۲' },
      { register: 'D515', label: 'Temputare_Calibre_3', labelFa: 'دمای کالیبره ۳', description: 'Calibrated Temputare 3', descriptionFa: 'دمای کالیبره شده ۳' },
      { register: 'D516', label: 'Temputare_Calibre_4', labelFa: 'دمای کالیبره ۴', description: 'Calibrated Temputare 4', descriptionFa: 'دمای کالیبره شده ۴' },
      { register: 'D520', label: 'Time_Main', labelFa: 'زمان اصلی', description: 'Time Minute Check', descriptionFa: 'بررسی زمان به دقیقه' },
      { register: 'D521', label: 'Time_Minute_Run', labelFa: 'زمان اجرا', description: 'Time Run Check', descriptionFa: 'بررسی زمان اجرا' },
      { register: 'D522', label: 'Time_Second_Run', labelFa: 'ثانیه اجرا', description: 'Time Second Check', descriptionFa: 'بررسی زمان به ثانیه' },
      { register: 'D525', label: 'GREEN', labelFa: 'چراغ سبز', description: 'RUN AUTOCLAV', descriptionFa: 'اجرای اتوکلاو' },
      { register: 'D526', label: 'RED', labelFa: 'چراغ قرمز', description: 'TEMP AUTOCLAV ERROR', descriptionFa: 'خطای دمای اتوکلاو' },
      { register: 'D527', label: 'YELLOW', labelFa: 'چراغ زرد', description: 'TIMER ZERO', descriptionFa: 'صفر شدن تایمر' },
    ],
  },
  {
    id: 6,
    name: 'PLC_06',
    displayName: 'اتوکلاو 06',
    slave_address: 6,
    registers: {
      start_address: 4596,
      end_address: 4645,
      count: 50,
    },
    database_registers: [
      { register: 'D500', label: 'Pressure', labelFa: 'فشار', description: 'Main Pressure Sensor', descriptionFa: 'سنسور فشار اصلی' },
      { register: 'D501', label: 'Pressure_min', labelFa: 'حداقل فشار', description: 'Condition Min Pressure', descriptionFa: 'حداقل فشار مجاز' },
      { register: 'D502', label: 'Temputare_main', labelFa: 'دمای اصلی', description: 'Main Temputare Sensor', descriptionFa: 'سنسور دمای اصلی' },
      { register: 'D503', label: 'Temputare_1', labelFa: 'دمای ۱', description: 'Temputare 1 Sensor', descriptionFa: 'سنسور دمای شماره ۱' },
      { register: 'D504', label: 'Temputare_2', labelFa: 'دمای ۲', description: 'Temputare 2 Sensor', descriptionFa: 'سنسور دمای شماره ۲' },
      { register: 'D505', label: 'Temputare_3', labelFa: 'دمای ۳', description: 'Temputare 3 Sensor', descriptionFa: 'سنسور دمای شماره ۳' },
      { register: 'D506', label: 'Temputare_4', labelFa: 'دمای ۴', description: 'Temputare 4 Sensor', descriptionFa: 'سنسور دمای شماره ۴' },
      { register: 'D507', label: 'Temputare_min', labelFa: 'حداقل دما', description: 'Condition Min Temputare', descriptionFa: 'حداقل دمای مجاز' },
      { register: 'D508', label: 'Temputare_max', labelFa: 'حداکثر دما', description: 'Condition Max Temputare', descriptionFa: 'حداکثر دمای مجاز' },
      { register: 'D513', label: 'Temputare_Calibre_1', labelFa: 'دمای کالیبره ۱', description: 'Calibrated Temputare 1', descriptionFa: 'دمای کالیبره شده ۱' },
      { register: 'D514', label: 'Temputare_Calibre_2', labelFa: 'دمای کالیبره ۲', description: 'Calibrated Temputare 2', descriptionFa: 'دمای کالیبره شده ۲' },
      { register: 'D515', label: 'Temputare_Calibre_3', labelFa: 'دمای کالیبره ۳', description: 'Calibrated Temputare 3', descriptionFa: 'دمای کالیبره شده ۳' },
      { register: 'D516', label: 'Temputare_Calibre_4', labelFa: 'دمای کالیبره ۴', description: 'Calibrated Temputare 4', descriptionFa: 'دمای کالیبره شده ۴' },
      { register: 'D520', label: 'Time_Main', labelFa: 'زمان اصلی', description: 'Time Minute Check', descriptionFa: 'بررسی زمان به دقیقه' },
      { register: 'D521', label: 'Time_Minute_Run', labelFa: 'زمان اجرا', description: 'Time Run Check', descriptionFa: 'بررسی زمان اجرا' },
      { register: 'D522', label: 'Time_Second_Run', labelFa: 'ثانیه اجرا', description: 'Time Second Check', descriptionFa: 'بررسی زمان به ثانیه' },
      { register: 'D525', label: 'GREEN', labelFa: 'چراغ سبز', description: 'RUN AUTOCLAV', descriptionFa: 'اجرای اتوکلاو' },
      { register: 'D526', label: 'RED', labelFa: 'چراغ قرمز', description: 'TEMP AUTOCLAV ERROR', descriptionFa: 'خطای دمای اتوکلاو' },
      { register: 'D527', label: 'YELLOW', labelFa: 'چراغ زرد', description: 'TIMER ZERO', descriptionFa: 'صفر شدن تایمر' },
    ],
  },
];

export const DATABASE_CONFIG = {
  server: 'localhost',
  database: 'PLCMonitoring',
  table_prefix: 'PLC_Data_',
};
