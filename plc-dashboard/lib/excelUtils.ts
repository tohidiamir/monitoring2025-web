import * as XLSX from 'xlsx';
const moment = require('jalali-moment');

interface ExportDataItem {
  [key: string]: any;
  Timestamp?: string;
}

interface RegisterConfig {
  register: string;
  label: string;
  labelFa: string;
  description: string;
  descriptionFa: string;
}

// تابع کمکی برای تبدیل تاریخ میلادی به شمسی از string
const toJalaliDateFromString = (timestampString: string): string => {
  try {
    // فرض می‌کنیم timestamp به صورت 'YYYY-MM-DD HH:mm:ss' است
    return moment(timestampString, 'YYYY-MM-DD HH:mm:ss').format('jYYYY/jMM/jDD');
  } catch (error) {
    return 'نامعلوم';
  }
};

// تابع کمکی برای تبدیل زمان از string
const toJalaliTimeFromString = (timestampString: string): string => {
  try {
    return moment(timestampString, 'YYYY-MM-DD HH:mm:ss').format('HH:mm:ss');
  } catch (error) {
    return 'نامعلوم';
  }
};

// تابع کمکی برای تبدیل تاریخ و زمان کامل از string
const toJalaliDateTimeFromString = (timestampString: string): string => {
  try {
    return moment(timestampString, 'YYYY-MM-DD HH:mm:ss').format('jYYYY/jMM/jDD HH:mm:ss');
  } catch (error) {
    return 'نامعلوم';
  }
};

export const exportToExcel = (
  data: ExportDataItem[], 
  registers: RegisterConfig[], 
  selectedRegisters: string[],
  plcName: string,
  dateRange: string
) => {
  if (data.length === 0) {
    alert('داده‌ای برای خروجی وجود ندارد');
    return;
  }

  // فیلتر کردن داده‌ها برای نمایش فقط رجیسترهای انتخابی
  const filteredData = data.map((item, index) => {
    const filteredItem: any = {};

    // استخراج تاریخ و ساعت از Timestamp
    if (item.Timestamp) {
      const timestampString = item.Timestamp;
      
      // بررسی فرمت timestamp
      if (typeof timestampString === 'string' && timestampString.length > 10) {
        filteredItem['ردیف'] = index + 1;
        filteredItem['تاریخ شمسی'] = toJalaliDateFromString(timestampString);
        filteredItem['ساعت'] = toJalaliTimeFromString(timestampString);
        filteredItem['زمان کامل شمسی'] = toJalaliDateTimeFromString(timestampString);
        filteredItem['تاریخ میلادی'] = timestampString.split(' ')[0]; // فقط بخش تاریخ
        filteredItem['زمان میلادی'] = timestampString; // کل timestamp
      } else {
        // اگر timestamp یک Date object بود
        const timestamp = new Date(item.Timestamp);
        if (!isNaN(timestamp.getTime())) {
          const isoString = timestamp.toISOString().replace('T', ' ').substring(0, 19);
          filteredItem['ردیف'] = index + 1;
          filteredItem['تاریخ شمسی'] = toJalaliDateFromString(isoString);
          filteredItem['ساعت'] = toJalaliTimeFromString(isoString);
          filteredItem['زمان کامل شمسی'] = toJalaliDateTimeFromString(isoString);
          filteredItem['تاریخ میلادی'] = timestamp.toLocaleDateString('en-GB');
          filteredItem['زمان میلادی'] = timestamp.toLocaleString('en-GB');
        } else {
          filteredItem['ردیف'] = index + 1;
          filteredItem['تاریخ شمسی'] = 'نامعلوم';
          filteredItem['ساعت'] = 'نامعلوم';
          filteredItem['زمان کامل شمسی'] = 'نامعلوم';
          filteredItem['تاریخ میلادی'] = 'نامعلوم';
          filteredItem['زمان میلادی'] = item.Timestamp;
        }
      }
    } else {
      filteredItem['ردیف'] = index + 1;
      filteredItem['تاریخ شمسی'] = 'ناموجود';
      filteredItem['ساعت'] = 'ناموجود';
      filteredItem['زمان کامل شمسی'] = 'ناموجود';
      filteredItem['تاریخ میلادی'] = 'ناموجود';
      filteredItem['زمان میلادی'] = 'ناموجود';
    }

    // اضافه کردن فقط رجیسترهای انتخابی
    selectedRegisters.forEach(registerLabel => {
      const registerConfig = registers.find(r => r.label === registerLabel);
      if (registerConfig && item[registerLabel] !== undefined && item[registerLabel] !== null) {
        const faLabel = registerConfig.labelFa || registerConfig.label;
        const value = item[registerLabel];
        
        // فرمت کردن اعداد
        if (typeof value === 'number') {
          // بررسی اینکه آیا این رجیستر مربوط به فشار یا دما است
          const isPressureOrTemperature = 
            registerLabel.toLowerCase().includes('pressure') || 
            registerLabel.toLowerCase().includes('فشار') ||
            registerLabel.toLowerCase().includes('temp') ||
            registerLabel.toLowerCase().includes('دما') ||
            registerLabel.toLowerCase().includes('حرارت');
          
          if (isPressureOrTemperature) {
            // برای فشار و دما: تقسیم بر 10 و یک رقم اعشار
            filteredItem[faLabel] = Number((value / 10).toFixed(1));
          } else {
            // برای سایر رجیسترها: سه رقم اعشار
            filteredItem[faLabel] = Number(value);
          }
        } else {
          filteredItem[faLabel] = value;
        }
      }
    });

    return filteredItem;
  });

  // ایجاد workbook
  const workbook = XLSX.utils.book_new();
  
  // تبدیل داده‌ها به worksheet
  const worksheet = XLSX.utils.json_to_sheet(filteredData);

  // تنظیم عرض ستون‌ها
  const colWidths = Object.keys(filteredData[0] || {}).map(key => ({
    wch: Math.max(key.length + 2, 15)
  }));
  worksheet['!cols'] = colWidths;

  // اضافه کردن worksheet به workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'گزارش PLC');

  // ایجاد نام فایل با تاریخ و زمان
  const now = new Date();
  const fileName = `PLC_${plcName}_${dateRange}_${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.xlsx`;

  // دانلود فایل
  XLSX.writeFile(workbook, fileName);
  
  // نمایش پیام موفقیت
  alert(`فایل Excel با نام "${fileName}" دانلود شد.\n${filteredData.length} رکورد صادر شد.`);
};

export const exportSelectedDataToExcel = (
  allData: ExportDataItem[],
  selectedIndices: number[],
  registers: RegisterConfig[],
  selectedRegisters: string[],
  plcName: string,
  dateRange: string
) => {
  if (selectedIndices.length === 0) {
    alert('لطفاً ردیف‌هایی برای خروجی انتخاب کنید');
    return;
  }

  const selectedData = selectedIndices.map(index => allData[index]).filter(Boolean);
  exportToExcel(selectedData, registers, selectedRegisters, plcName, dateRange);
};
