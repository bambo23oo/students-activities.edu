import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {StudentJournalPreview} from './components/StudentJournalPreview.tsx';
import {StudentDemoAccess} from './components/StudentDemoAccess.tsx';
import './index.css';

const params = new URLSearchParams(window.location.search);
const showStudentPreview = params.get('student-preview') === '1';
const showStudentDemo = params.get('student-demo') === '1';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showStudentDemo ? <StudentDemoAccess /> : showStudentPreview ? <StudentJournalPreview /> : <App />}
  </StrictMode>,
);
