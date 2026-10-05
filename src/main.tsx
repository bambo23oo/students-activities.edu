import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {StudentJournalPreview} from './components/StudentJournalPreview.tsx';
import {StudentDemoAccess} from './components/StudentDemoAccess.tsx';
import {StudentOnboarding} from './components/StudentOnboarding.tsx';
import './index.css';

const params = new URLSearchParams(window.location.search);
const showStudentPreview = params.get('student-preview') === '1';
const showStudentDemo = params.get('student-demo') === '1';
const showOnboardingPreview = params.get('student-onboarding-preview') === '1';
const onboardingDemoProfile = {
  id: '690000000001', prefix: 'นางสาว', firstName: 'ตัวอย่าง', lastName: 'นักศึกษา',
  major: 'สาขาวิชาการศึกษาปฐมวัย', year: 1, universityEmail: '', photoPath: '', photoUrl: ''
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showOnboardingPreview ? <StudentOnboarding studentId={onboardingDemoProfile.id}
      demoProfile={onboardingDemoProfile} onComplete={() => {}}
      onLogout={() => window.location.assign('?student-demo=1')} />
      : showStudentDemo ? <StudentDemoAccess /> : showStudentPreview ? <StudentJournalPreview /> : <App />}
  </StrictMode>,
);
