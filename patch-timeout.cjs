const fs = require('fs');
let content = fs.readFileSync('src/components/StaffScanner.tsx', 'utf8');

const targetEffect = `  useEffect(() => {
    // Initial cleanup of any corrupted Thai records in IndexedDB`;

const replacementEffect = `  useEffect(() => {
    let timeoutId: any;
    if (scanResult) {
      timeoutId = setTimeout(() => {
        setScanResult(null);
      }, 2500);
    }
    return () => clearTimeout(timeoutId);
  }, [scanResult]);

  useEffect(() => {
    // Initial cleanup of any corrupted Thai records in IndexedDB`;

content = content.replace(targetEffect, replacementEffect);

const targetFinally = `    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);

      // Auto clear result toast
      setTimeout(() => {
        setScanResult(null);
      }, 2500);
    }
  };`;

const replacementFinally = `    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 500);
    }
  };`;

content = content.replace(targetFinally, replacementFinally);

fs.writeFileSync('src/components/StaffScanner.tsx', content);
