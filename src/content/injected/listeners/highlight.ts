import type { LogFn } from '../shared';

export function setupHighlightListener(log: LogFn) {
  // Listen for highlight requests from content script
  window.addEventListener('message', (event) => {
    if (!(event.data && event.data.source === 'auction-inspector' && event.data.type === 'HIGHLIGHT_SLOT')) {
      return;
    }

    const { slotCode } = event.data.payload as { slotCode: string };
    log('Highlighting slot:', slotCode);

    // Find element by id = slotCode
    const el = document.getElementById(slotCode);
    if (!el) {
      log('Element not found:', slotCode);
      return;
    }

    // Scroll to the element
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Apply red dotted border
    const originalBorder = el.style.border;
    const originalTransformOrigin = el.style.transformOrigin;
    el.style.border = '3px dotted red';
    el.style.transformOrigin = 'center center';

    // Animate a full 360deg rotation
    const animation = el.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
      {
        duration: 1000,
        easing: 'ease-in-out',
      },
    );

    // Remove highlight after animation completes
    animation.onfinish = () => {
      // Keep the border for a moment after animation so user can see it
      setTimeout(() => {
        el.style.border = originalBorder;
        el.style.transformOrigin = originalTransformOrigin;
      }, 3000);
    };
  });
}