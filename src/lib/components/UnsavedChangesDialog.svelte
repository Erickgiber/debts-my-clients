<script lang="ts">
  let {
    open = false,
    title = 'Descartar cambios',
    description = 'Tienes datos sin guardar. ¿Cerrar y perderlos?',
    confirmText = 'Salir sin guardar',
    cancelText = 'Seguir editando',
    onConfirm,
    onCancel,
  }: {
    open?: boolean;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } = $props();

  function handleBackdrop(e: MouseEvent) {
    e.stopPropagation();
    onCancel?.();
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div
      class="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-sm"
      aria-hidden="true"
      onclick={handleBackdrop}
    ></div>
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-title"
      class="animate-scale-in relative w-full max-w-sm origin-center rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5"
    >
      <div class="space-y-4">
        <header class="space-y-1">
          <h3 id="unsaved-title" class="text-sm font-semibold tracking-tight text-zinc-900">
            {title}
          </h3>
          <p class="text-xs leading-relaxed text-zinc-600">{description}</p>
        </header>
        <div class="flex flex-col gap-2 pt-2 sm:flex-row-reverse sm:justify-end">
          <button
            type="button"
            class="inline-flex flex-1 items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 transition ring-inset hover:bg-red-50 active:scale-[.97]"
            onclick={onConfirm}>{confirmText}</button
          >
          <button
            type="button"
            class="inline-flex flex-1 items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[.97]"
            onclick={onCancel}>{cancelText}</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .animate-fade-in {
    animation: fade-in 0.15s ease-out forwards;
  }
  .animate-scale-in {
    animation: scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  @keyframes fade-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  @keyframes scale-in {
    0% {
      opacity: 0;
      transform: translateY(4px) scale(0.96);
    }
    100% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .animate-fade-in,
    .animate-scale-in {
      animation: none !important;
    }
  }
</style>
