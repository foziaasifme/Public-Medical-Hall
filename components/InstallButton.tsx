import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui/Button';
import { useDialog } from '../DialogContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { showConfirm } = useDialog();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    const confirmed = await showConfirm(
      'Would you like to install this application for a faster experience and offline access?',
      'Install Application'
    );

    if (confirmed) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    }
  };

  if (isInstalled || !deferredPrompt) return null;

  return (
    <Button onClick={handleInstall} className="gap-2 bg-blue-600 hover:bg-blue-700">
      <Download size={18} /> Install Application
    </Button>
  );
};
