export interface DoctorRecord {
  province: string;
  city: string;
  hospital: string;
  department: string;
  phone: string;
  notes?: string;
}

// 省份邻接表（用于推荐排序：本地 → 邻近省份 → 其他）
const PROVINCE_PROXIMITY: Record<string, string[]> = {
  '北京': ['天津', '河北'],
  '天津': ['北京', '河北'],
  '上海': ['江苏', '浙江'],
  '重庆': ['四川', '贵州', '湖北', '湖南'],
  '河北': ['北京', '天津', '山东', '河南', '山西', '内蒙古', '辽宁'],
  '山西': ['河北', '河南', '陕西', '内蒙古'],
  '内蒙古': ['黑龙江', '吉林', '辽宁', '河北', '山西', '陕西', '宁夏', '甘肃'],
  '辽宁': ['吉林', '内蒙古', '河北'],
  '吉林': ['黑龙江', '辽宁', '内蒙古'],
  '黑龙江': ['吉林', '内蒙古'],
  '江苏': ['上海', '浙江', '安徽', '山东'],
  '浙江': ['上海', '江苏', '安徽', '江西', '福建'],
  '安徽': ['江苏', '浙江', '江西', '湖北', '河南', '山东'],
  '福建': ['浙江', '江西', '广东'],
  '江西': ['浙江', '安徽', '湖北', '湖南', '广东', '福建'],
  '山东': ['河北', '河南', '安徽', '江苏'],
  '河南': ['河北', '山西', '陕西', '湖北', '安徽', '山东'],
  '湖北': ['河南', '陕西', '重庆', '湖南', '江西', '安徽'],
  '湖南': ['湖北', '重庆', '贵州', '广西', '广东', '江西'],
  '广东': ['湖南', '江西', '福建', '广西', '海南'],
  '广西': ['广东', '湖南', '贵州', '云南'],
  '海南': ['广东'],
  '四川': ['重庆', '贵州', '云南', '西藏', '青海', '甘肃', '陕西'],
  '贵州': ['四川', '重庆', '湖南', '广西', '云南'],
  '云南': ['四川', '贵州', '广西', '西藏'],
  '西藏': ['新疆', '青海', '四川', '云南'],
  '陕西': ['内蒙古', '山西', '河南', '湖北', '重庆', '四川', '甘肃', '宁夏'],
  '甘肃': ['内蒙古', '宁夏', '青海', '新疆', '四川', '陕西'],
  '青海': ['甘肃', '新疆', '西藏', '四川'],
  '宁夏': ['内蒙古', '陕西', '甘肃'],
  '新疆': ['甘肃', '青海', '西藏', '内蒙古'],
};

export const doctorData: DoctorRecord[] = [
  // ── 上海 ──
  {
    province: '上海', city: '上海',
    hospital: '上海市精神卫生中心',
    department: '成人ADHD门诊',
    phone: '(021)64387250',
  },
  {
    province: '上海', city: '上海',
    hospital: '上海同济大学附属同济医院',
    department: '精神科',
    phone: '(021)56051080',
    notes: '具体科室可电话咨询',
  },
  {
    province: '上海', city: '上海',
    hospital: '上海市宝山区精神卫生中心',
    department: '线下普通门诊',
    phone: '(021)56609770',
  },
  {
    province: '上海', city: '上海',
    hospital: '上海市第一人民医院松江南院',
    department: '心理科',
    phone: '(021)63240090',
  },
  {
    province: '上海', city: '上海',
    hospital: '上海第一人民医院虹口院区',
    department: '心理科',
    phone: '(021)63240090',
  },
  // ── 北京 ──
  {
    province: '北京', city: '北京',
    hospital: '北京大学人民医院',
    department: '医学心理科-专病门诊-注意缺陷与多动障碍门诊',
    phone: '(010)88325219',
  },
  {
    province: '北京', city: '北京',
    hospital: '北京安定医院',
    department: '注意力缺陷与多动障碍门诊',
    phone: '(010)86430066',
    notes: '特需门诊｜儿科也可以去(备选)',
  },
  // ── 云南 ──
  {
    province: '云南', city: '昆明',
    hospital: '昆明医学院附属第一医院(云大医院)',
    department: '精神科',
    phone: '(0871)65324888',
  },
];

export type HospitalPriority = 'local' | 'nearby' | 'far';

export interface SortedHospital extends DoctorRecord {
  priority: HospitalPriority;
}

/** 获取按距离排序的医院列表：本地 → 邻近 → 其他 */
export function getSortedHospitals(selectedProvince: string): SortedHospital[] {
  const nearby = new Set(PROVINCE_PROXIMITY[selectedProvince] || []);

  return doctorData
    .map((doctor) => {
      let priority: HospitalPriority;
      if (doctor.province === selectedProvince) {
        priority = 'local';
      } else if (nearby.has(doctor.province)) {
        priority = 'nearby';
      } else {
        priority = 'far';
      }
      return { ...doctor, priority };
    })
    .sort((a, b) => {
      const order = { local: 0, nearby: 1, far: 2 };
      return order[a.priority] - order[b.priority];
    });
}

/** 获取某省份的本地医院（ProvincePicker 用于判断是否有本地数据） */
export function getDoctorsByProvince(province: string): DoctorRecord[] {
  return doctorData.filter((doctor) => doctor.province === province);
}

export function getDoctorsByCity(province: string, city: string): DoctorRecord[] {
  return doctorData.filter((doctor) => doctor.province === province && doctor.city === city);
}
