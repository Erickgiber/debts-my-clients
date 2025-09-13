<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  // Props (runes):
  let {
    labelledBy,
    size = 'md', // md | lg | xl
    beforeClose,
    onClose,
    children,
    noInitialFocus = false,
  }: {
    labelledBy?: string;
    size?: 'md' | 'lg' | 'xl';
    beforeClose?: () => boolean | void;
    onClose?: () => void;
    children?: (api: { close: () => void }) => any;
    noInitialFocus?: boolean;
  } = $props();

  let host: HTMLDivElement | null = null;
  let panel: HTMLDivElement | null = null;
  let prevFocus: HTMLElement | null = null;
  let closing = $state(false);
  let reduceMotion = $state(false);

  function computeReduceMotion() {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  $effect(() => {
    reduceMotion = computeReduceMotion();
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => (reduceMotion = mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });

  function attemptClose() {
    if (closing) return;
    if (beforeClose && beforeClose() === false) return; // abort
    closing = true;
    if (reduceMotion) finalizeClose();
    else {
      // match panel exit animation (220ms)
      setTimeout(finalizeClose, 220);
    }
  }
  function finalizeClose() {
    onClose?.();
    // host removal handled by onDestroy after state toggled externally (parent unmount)
    // We signal parent by calling onClose which should flip its editing flag.
  }

  function trapKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      attemptClose();
      return;
    }
    if (e.key === 'Tab' && panel) {
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'input,button,select,textarea,a[href],[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'));
      if (!focusables.length) return;
      const current = document.activeElement as HTMLElement;
      let index = focusables.indexOf(current);
      if (e.shiftKey) index = index <= 0 ? focusables.length - 1 : index - 1;
      else index = index === focusables.length - 1 ? 0 : index + 1;
      e.preventDefault();
      focusables[index].focus();
    }
  }

  onMount(() => {
    if (!host) return;
    document.body.appendChild(host);
    prevFocus = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', trapKey);
    queueMicrotask(() => {
      if (noInitialFocus) return;
      const first = panel?.querySelector<HTMLElement>(
        'input,button,select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
      document.body.style.overflow = 'hidden';
    });
  });
  onDestroy(() => {
    document.removeEventListener('keydown', trapKey);
    document.body.style.overflow = '';
    if (prevFocus) prevFocus.focus();
    host?.remove();
  });

  function sizeClass() {
    switch (size) {
      case 'lg':
        return 'max-w-3xl';
      case 'xl':
        return 'max-w-5xl';
      default:
        return 'max-w-2xl';
    }
  }
</script>

<div bind:this={host} class="fixed inset-0 z-[1000] overflow-y-auto">
  <!-- Backdrop -->
  <div
    class="fixed inset-0 bg-black/50 transition-opacity duration-200 ${closing
      ? 'opacity-0'
      : 'opacity-100'}"
    role="presentation"
    aria-hidden="true"
    onclick={attemptClose}
  ></div>
  <!-- Panel wrapper uses padding to keep space around when scrolling -->
  <div class="min-h-full w-full px-4 py-10 sm:px-6 lg:px-8">
    <div
      bind:this={panel}
      class={`relative mx-auto w-full ${sizeClass()} rounded-2xl bg-white p-6 shadow-2xl outline-none ${reduceMotion ? '' : closing ? 'animate-modal-exit' : 'animate-modal-enter'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      tabindex="-1"
      style="max-height:calc(100vh - 4rem);overflow:auto;"
    >
      {@render children?.({ close: attemptClose })}
    </div>
  </div>
</div>

<style>
  @keyframes modal-enter-keyframes {
    0% {
      opacity: 0;
      transform: translateY(12px) scale(0.96);
    }
    60% {
      opacity: 1;
      transform: translateY(0) scale(1.01);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  @keyframes modal-exit-keyframes {
    0% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    40% {
      opacity: 0.6;
      transform: translateY(4px) scale(0.98);
    }
    100% {
      opacity: 0;
      transform: translateY(8px) scale(0.94);
    }
  }
  .animate-modal-enter {
    animation: modal-enter-keyframes 0.25s cubic-bezier(0.16, 0.8, 0.24, 1) forwards;
  }
  .animate-modal-exit {
    animation: modal-exit-keyframes 0.22s ease forwards;
  }
</style>
