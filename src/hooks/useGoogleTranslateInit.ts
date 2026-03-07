import { useEffect } from 'react';

const useGoogleTranslateInit = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const attemptInit = () => {
      const initFn = (window as any).googleTranslateElementInit;
      const googleNamespace = (window as any).google;
      if (typeof initFn === 'function' && googleNamespace?.translate) {
        initFn();
      }
    };

    const script = document.getElementById('google-translate-script');
    const handleLoad = () => {
      attemptInit();
    };

    script?.addEventListener('load', handleLoad);
    attemptInit();

    return () => {
      script?.removeEventListener('load', handleLoad);
    };
  }, []);
};

export default useGoogleTranslateInit;
