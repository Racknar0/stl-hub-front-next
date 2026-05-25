'use client'

import { useEffect, useRef } from "react";

const VantaBackground = () => {
  const vantaRef = useRef(null);

  useEffect(() => {
    let active = true;
    let vantaEffectInstance = null;

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        // If script is already there, resolve
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          if (existing.dataset.loaded === 'true') {
            resolve();
          } else {
            existing.addEventListener('load', resolve);
            existing.addEventListener('error', reject);
          }
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.dataset.loaded = 'false';
        script.onload = () => {
          script.dataset.loaded = 'true';
          resolve();
        };
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const init = async () => {
      try {
        // Load three.js first
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        // Then load vanta.net
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js');

        if (!active) return;

        if (window.VANTA?.NET && vantaRef.current) {
          vantaEffectInstance = window.VANTA.NET({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.0,
            minWidth: 200.0,
            scale: 1.0,
            scaleMobile: 1.0,
            color: 0x414e89,
            backgroundColor: 0x210f31
          });
        }
      } catch (err) {
        console.error('Failed to load Vanta background scripts:', err);
      }
    };

    init();

    return () => {
      active = false;
      if (vantaEffectInstance) {
        vantaEffectInstance.destroy();
      }
    };
  }, []);

  return <div ref={vantaRef} style={{ position: 'fixed', top: 0, left: 0, zIndex: -10, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

export default VantaBackground;
