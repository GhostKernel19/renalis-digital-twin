import React, { useState } from 'react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { DemoBanner } from '../components/DemoBanner';
import { useApp, type AppLanguage } from '../context/AppContext';
import './LanguageHelpPage.css';

export const LanguageHelpPage: React.FC = () => {
  const { language, setLanguage, textSize, setTextSize, t } = useApp();
  const [demoCallToast, setDemoCallToast] = useState(false);

  const languages: Array<{ code: AppLanguage; nativeName: string; englishName: string }> = [
    { code: 'en', nativeName: 'English', englishName: '' },
    { code: 'hi', nativeName: 'हिंदी', englishName: 'Hindi' },
    { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi' },
  ];

  const handleCallHealthWorker = () => {
    setDemoCallToast(true);
    setTimeout(() => setDemoCallToast(false), 4000);
  };

  return (
    <div className="language-help-page">
      <DemoBanner text={t.demoNotice} />

      <PageHeader
        title={t.langHelpTitle}
        subtitle={t.langHelpSubtitle}
      />

      {demoCallToast && (
        <div style={{
          backgroundColor: 'var(--tag-green-bg)',
          color: 'var(--tag-green-text)',
          border: '1px solid var(--tag-green-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          fontWeight: 600,
          fontSize: '15px',
        }} role="status">
          📞 Simulated call to Community Health Worker Meena Deshmukh (Demo only)
        </div>
      )}

      <div className="language-help-grid two-column-grid">
        {/* Left Column: Language & Text Size */}
        <div className="left-stack">
          {/* Card 1: Your language */}
          <Card variant="raised" padding="md" className="lang-selection-card">
            <h2 className="card-section-title">{t.yourLanguageTitle}</h2>
            <p className="card-section-desc">{t.yourLanguageDesc}</p>

            <div className="lang-options-list" role="radiogroup" aria-label="Language selection">
              {languages.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`lang-option-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setLanguage(lang.code)}
                  >
                    <div className="lang-option-text">
                      <span className="lang-native">{lang.nativeName}</span>
                      {lang.englishName && (
                        <span className="lang-sub">{lang.englishName}</span>
                      )}
                    </div>
                    <div className="lang-check-circle" aria-hidden="true">
                      {isSelected ? (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#176B63" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="16 9 10 15 8 13" />
                        </svg>
                      ) : (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A9CAE" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="lang-note">
              {language === 'en'
                ? 'English is selected. All patient screens are translated.'
                : language === 'hi'
                ? 'हिंदी भाषा चुनी गई है। सभी स्क्रीन हिंदी में प्रदर्शित हैं।'
                : 'मराठी भाषा निवडली आहे. सर्व पृष्ठे मराठीमध्ये उपलब्ध आहेत.'}
            </p>
          </Card>

          {/* Card 2: Text size */}
          <Card variant="raised" padding="md" className="text-size-card">
            <h2 className="card-section-title">{t.textSizeTitle}</h2>
            <p className="card-section-desc">Choose between standard 18px and larger 22px reading size.</p>

            <div className="text-size-buttons">
              <button
                type="button"
                className={`text-size-btn ${textSize === '18px' ? 'is-active' : ''}`}
                onClick={() => setTextSize('18px')}
              >
                {textSize === '18px' && <span className="check-mark">✓ </span>}
                {t.textSizeStandard}
              </button>
              <button
                type="button"
                className={`text-size-btn ${textSize === '22px' ? 'is-active' : ''}`}
                onClick={() => setTextSize('22px')}
              >
                {textSize === '22px' && <span className="check-mark">✓ </span>}
                {t.textSizeLarger}
              </button>
            </div>
            <p className={`preview-sample ${textSize === '22px' ? 'preview-large' : ''}`}>
              {t.textSizePreview}
            </p>
          </Card>
        </div>

        {/* Right Column: Health worker & Emergency */}
        <div className="right-stack">
          {/* Card 3: Talk to your health worker */}
          <Card variant="raised" padding="md" className="worker-contact-card">
            <h2 className="card-section-title">{t.healthWorkerTitle}</h2>

            <div className="worker-header">
              <div className="worker-avatar">MD</div>
              <div className="worker-info">
                <strong className="worker-name">Meena Deshmukh</strong>
                <span className="worker-languages">{t.healthWorkerRole}</span>
              </div>
            </div>

            <p className="worker-support-text">
              {t.healthWorkerDesc}
            </p>

            <div className="worker-schedule">
              <strong>{t.healthWorkerHours}</strong>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleCallHealthWorker}
              iconLeft={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              }
            >
              {t.healthWorkerCallBtn}
            </Button>

            <p className="contact-demo-disclaimer">
              {t.healthWorkerDemoNotice}
            </p>
          </Card>

          {/* Card 4: Need urgent help? */}
          <Card variant="raised" padding="md" className="emergency-card">
            <h2 className="card-section-title">{t.urgentHelpTitle}</h2>
            <p className="emergency-text">
              {t.urgentHelpText}
            </p>
            <Button
              variant="danger"
              size="md"
              onClick={() => window.open('tel:112')}
              iconLeft={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              }
            >
              {t.emergencyCallBtn}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
