'use client';

export default function ContactPage() {
  return (
    <div className="container">
      <div className="header">
        <h1>联系作者</h1>
      </div>

      <div className="contact-content" style={{ padding: '0 16px' }}>
        {/* 作者介绍 */}
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px'
        }}>
          <div style={{ fontSize: '15px', color: '#475569', lineHeight: 1.8 }}>
            <p style={{ margin: '0 0 12px 0' }}>
              你好，我是Wayne韦恩。一个ADHD，经常在紧张和快节奏中结巴和懵圈，所以我做了这个产品，通过五十道题的选择，帮您梳理好信息。点击医生查看模式后去初次就诊就可以直接拿给医生看，避免紧张和遗漏。
            </p>
            <p style={{ margin: '0 0 12px 0' }}>
              如果您有任何建议或者想跟我聊的，请加我的微信，ADHD也可以跟我申请加入我发起的ADHD线上互助会。
            </p>
            <p style={{ margin: '0' }}>
              祝所有朋友生活顺利 ❤️
            </p>
          </div>
        </div>

        {/* 微信二维码 */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }}>
          <img
            src="/wechat-qr.jpg"
            alt="微信二维码"
            style={{
              width: '100%',
              maxWidth: '280px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}
          />
        </div>
      </div>
    </div>
  );
}
