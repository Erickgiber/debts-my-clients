<script lang="ts">
  import ModalPortal from '$lib/components/SaleModalPortal.svelte';
  import UnsavedChangesDialog from '$lib/components/UnsavedChangesDialog.svelte';
  import SaleFormBase from '$lib/components/SaleFormBase.svelte';
  import type { NewSaleForm } from '$lib/core/types';
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

  // Reemplazamos la lógica duplicada del formulario usando SaleFormBase.
  // Control de cambios sin guardar
  let showConfirm = $state(false);
  let ignoreUnsaved = $state(false);
  let formRef: any = $state(null); // instancia de SaleFormBase
</script>

<!-- Svelte snippet (outside <script>) used as children for ModalPortal -->
{#snippet newSaleModal({ close }: { close: () => void })}
  <div class="flex flex-col gap-5">
    <header class="flex items-start justify-between gap-3">
      <h2
        id="new-sale-modal-title"
        class="text-base font-semibold tracking-tight dark:text-zinc-100"
      >
        {mode === 'sales' ? 'Nueva venta' : 'Nueva deuda'}
      </h2>
      <button
        type="button"
        class="grid h-9 w-9 place-content-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Cerrar"
        onclick={() => close()}>✕</button
      >
    </header>
    <SaleFormBase
      bind:this={formRef}
      {debtorSuggestions}
      {productSuggestions}
      {bolivarRate}
      variant="modal"
      onSubmit={(f: NewSaleForm) => {
        onsubmit?.(f);
        // cierre se gestiona en onClose tras animación
      }}
      onCancel={() => close()}
    />
    <UnsavedChangesDialog
      open={showConfirm}
      onConfirm={() => {
        ignoreUnsaved = true;
        showConfirm = false;
        close();
      }}
      onCancel={() => (showConfirm = false)}
      title="Descartar cambios"
      description={mode === 'sales'
        ? 'Tienes datos sin guardar en esta nueva venta. ¿Cerrar y perderlos?'
        : 'Tienes datos sin guardar en esta nueva deuda. ¿Cerrar y perderlos?'}
      confirmText="Salir sin guardar"
      cancelText="Seguir editando"
    />
  </div>
{/snippet}

{#if open}
  <ModalPortal
    labelledBy="new-sale-modal-title"
    size="lg"
    beforeClose={() => {
      if (formRef?.hasUserInput?.() && !ignoreUnsaved) {
        showConfirm = true;
        return false; // stop close, show custom dialog
      }
      ignoreUnsaved = false; // reset flag for next open
    }}
    onClose={() => {
      formRef?.reset?.();
      showConfirm = false;
      ignoreUnsaved = false;
      oncancel?.();
    }}
    children={newSaleModal}
  />
{/if}
