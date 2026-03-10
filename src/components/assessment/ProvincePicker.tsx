'use client';

import { getDoctorsByProvince } from '@/data/doctors';

interface ProvincePickerProps {
  onSelect: (province: string) => void;
  onSkip: () => void;
}

const MUNICIPALITIES = ['北京', '上海', '天津', '重庆'];

const OTHER_PROVINCES = [
  '安徽',
  '福建',
  '甘肃',
  '广东',
  '广西',
  '贵州',
  '海南',
  '河北',
  '河南',
  '黑龙江',
  '湖北',
  '湖南',
  '吉林',
  '江苏',
  '江西',
  '辽宁',
  '内蒙古',
  '宁夏',
  '青海',
  '山东',
  '山西',
  '陕西',
  '四川',
  '西藏',
  '新疆',
  '云南',
  '浙江',
];

export default function ProvincePicker({ onSelect, onSkip }: ProvincePickerProps) {
  return (
    <div className="province-picker-page">
      <div className="province-picker-card">
        <h2>选择省份</h2>
        <p>用于展示附近 ADHD 医生信息，后续可在摘要页查看。</p>

        <div className="province-picker-section">
          <h3>直辖市</h3>
          <div className="province-municipality-grid">
            {MUNICIPALITIES.map((province) => {
              const hasData = getDoctorsByProvince(province).length > 0;
              return (
                <button
                  key={province}
                  type="button"
                  className={`province-btn ${hasData ? '' : 'is-empty'}`}
                  onClick={() => onSelect(province)}
                >
                  {province}
                </button>
              );
            })}
          </div>
        </div>

        <div className="province-picker-section">
          <h3>其他省份</h3>
          <div className="province-grid">
            {OTHER_PROVINCES.map((province) => {
              const hasData = getDoctorsByProvince(province).length > 0;
              return (
                <button
                  key={province}
                  type="button"
                  className={`province-btn ${hasData ? '' : 'is-empty'}`}
                  onClick={() => onSelect(province)}
                >
                  {province}
                </button>
              );
            })}
          </div>
        </div>

        <div className="province-picker-actions">
          <button type="button" className="province-skip" onClick={onSkip}>
            跳过
          </button>
        </div>
      </div>
    </div>
  );
}
