<script lang="ts">
  import type { NewSaleForm } from '$lib/core/types';
  import UnsavedChangesDialog from './UnsavedChangesDialog.svelte';
  import SaleFormBase from '$lib/components/SaleFormBase.svelte';

  import { appMode } from '$lib/core/mode';

  let mode = $state<'sales' | 'debts'>('sales');
  $effect.pre(() => {
    const unsub = appMode.subscribe((m) => (mode = m));
    return () => unsub();
  });

  let {
    open = false,
    onsubmit,
    oncancel,
    debtorSuggestions = [],
    productSuggestions = [],
    bolivarRate = null,
  }: {
    open?: boolean;
    onsubmit?: (detail: NewSaleForm) => void;
    oncancel?: () => void;
    debtorSuggestions?: string[];
    productSuggestions?: string[];
    bolivarRate?: number | null;
  } = $props();

  let showConfirm = $state(false);
  let ignoreUnsaved = $state(false);
  // Referencia al componente hijo para acceder a helpers reset() / hasUserInput()
  let formRef: any = $state(null);

  function attemptClose() {
    if (formRef?.hasUserInput?.() && !ignoreUnsaved) {
      showConfirm = true;
      return;
    }
    doClose();
  }
  function doClose() {
    showConfirm = false;
    ignoreUnsaved = false;
    formRef?.reset?.();
    oncancel?.();
  }
  function stayEditing() {
    showConfirm = false;
  }
  function discardAndClose() {
    ignoreUnsaved = true;
    attemptClose();
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex">
    <button
      type="button"
      class="flex-1 bg-black/40 dark:bg-black/60"
      onclick={attemptClose}
      aria-label="Cerrar"
    ></button>
    <aside
      class="ml-auto h-full w-full max-w-md overflow-y-auto rounded-l-2xl bg-white p-4 shadow-xl lg:max-w-xl lg:p-6 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <header class="flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold dark:text-zinc-100">
          {mode === 'sales' ? 'Nueva venta' : 'Nueva deuda'}
        </h2>
        <button
          type="button"
          class="grid size-8 place-content-center rounded-lg hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          onclick={attemptClose}
          aria-label="Cerrar">✕</button
        >
      </header>
      <div class="mt-4">
        <SaleFormBase
          bind:this={formRef}
          {debtorSuggestions}
          {productSuggestions}
          {bolivarRate}
          variant="sheet"
          submitLabel="Guardar"
          cancelLabel="Cancelar"
          onSubmit={(f: NewSaleForm) => {
            onsubmit?.(f);
            doClose();
          }}
          onCancel={attemptClose}
        />
      </div>
      <UnsavedChangesDialog
        open={showConfirm}
        onConfirm={discardAndClose}
        onCancel={stayEditing}
        title="Descartar cambios"
        description="Tienes datos sin guardar. ¿Cerrar y perderlos?"
        confirmText="Salir sin guardar"
        cancelText="Seguir editando"
      />
    </aside>
  </div>
{/if}

<style></style>
