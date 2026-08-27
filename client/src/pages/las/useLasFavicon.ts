import { useEffect } from 'react';

const DEFAULT_ICON = '/xunxinli-avatar-cream.png';
const LAS_ICON = '/las-icon.svg';

export function useLasFavicon(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) return;
    const original = link.href;
    if (original !== LAS_ICON) {
      link.href = LAS_ICON;
    }
    return () => {
      link.href = original || DEFAULT_ICON;
    };
  }, [enabled]);
}
