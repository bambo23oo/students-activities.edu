import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {StudentJournalPreview} from './components/StudentJournalPreview.tsx';
import './index.css';

const showStudentPreview = new URLSearchParams(window.location.search).get('student-preview') === '1';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showStudentPreview ? <StudentJournalPreview /> : <App />}
  </StrictMode>,
);
