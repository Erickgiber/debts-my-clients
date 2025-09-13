<script lang="ts">
  import ModalPortal from '$lib/components/SaleModalPortal.svelte';
  import type { NewSaleForm } from '$lib/core/types';

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

  let form: NewSaleForm = $state({
    debtorName: '',
    phone: '',
    items: [{ product: '', quantity: 1, unitPrice: 0 }],
    delivered: false,
    notes: '',
  });
  // Dirty: en algunos navegadores/reportes el cierre afuera no disparaba confirm correctamente.
  // Usamos una función que evalúa en tiempo real si hay datos ingresados distintos al estado vacío inicial.
  function hasUserInput(): boolean {
    if (form.debtorName.trim()) return true;
    if (form.phone?.trim()) return true;
    if (form.notes?.trim()) return true;
    if (form.delivered) return true;
    if (form.items.length !== 1) return true; // se añadió/eliminó
    const only = form.items[0];
    if (only.product.trim()) return true;
    if (only.quantity !== 1) return true;
    if (only.unitPrice !== 0) return true;
    return false;
  }

  function reset() {
    form = {
      debtorName: '',
      phone: '',
      items: [{ product: '', quantity: 1, unitPrice: 0 }],
      delivered: false,
      notes: '',
    };
  }
  function addItem() {
    form.items.push({ product: '', quantity: 1, unitPrice: 0 });
  }
  function removeItem(index: number) {
    if (form.items.length === 1) return;
    form.items.splice(index, 1);
  }
  const total = $derived(form.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0));
  // Validación refinada:
  // - Cliente obligatorio
  // - Se consideran "items activos" los que tienen algún dato distinto al default
  // - Debe existir al menos 1 item activo
  // - Cada item activo requiere: producto.trim() && quantity > 0 && unitPrice > 0 (precio estrictamente positivo)
  function computeFormValid(): boolean {
    if (!form.debtorName.trim()) return false;
    const activeItems = form.items.filter(
      (it) => it.product.trim() || it.quantity !== 1 || it.unitPrice !== 0,
    );
    if (!activeItems.length) return false;
    for (const it of activeItems) {
      if (!it.product.trim()) return false;
      if (typeof it.quantity !== 'number' || it.quantity <= 0) return false;
      if (typeof it.unitPrice !== 'number' || it.unitPrice <= 0) return false;
    }
    return true;
  }
  const formValid = $derived(computeFormValid());

  function submit(e: Event) {
    e.preventDefault();
    if (!form.debtorName.trim()) return;
    // Reutilizamos la lógica de formValid pero evitando doble recorrido innecesario.
    if (!formValid) return;
    onsubmit?.(form);
    // El cierre real (y reset) se maneja en onClose para permitir animación.
  }
  const confirmMessage = 'Hay datos sin guardar. ¿Cerrar de todos modos?';
  // Custom confirmation state (replaces blocking native confirm)
  let showConfirm = $state(false);
  let ignoreUnsaved = $state(false); // when true, next close proceeds without prompt

  function cancelUnsavedPrompt() {
    showConfirm = false;
  }
  function confirmUnsaved(close: () => void) {
    ignoreUnsaved = true;
    showConfirm = false;
    close();
  }
</script>

<!-- Svelte snippet (outside <script>) used as children for ModalPortal -->
{#snippet newSaleModal({ close }: { close: () => void })}
  <div class="flex flex-col gap-5">
    <header class="flex items-start justify-between gap-3">
      <h2 id="new-sale-modal-title" class="text-base font-semibold tracking-tight">Nueva venta</h2>
      <button
        type="button"
        class="grid h-9 w-9 place-content-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
        aria-label="Cerrar"
        onclick={() => close()}>✕</button
      >
    </header>
    <form id="new-sale-form" class="space-y-5" onsubmit={submit}>
      <div class="grid gap-1">
        <label class="text-xs text-zinc-600" for="cliente-modal">Cliente</label>
        <input
          id="cliente-modal"
          class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
          placeholder="Nombre"
          bind:value={form.debtorName}
          list="debtor-suggestions-modal"
          required
        />
        {#if debtorSuggestions?.length}
          <datalist id="debtor-suggestions-modal">
            {#each debtorSuggestions as name}
              <option value={name}></option>
            {/each}
          </datalist>
        {/if}
      </div>
      <div class="grid gap-1">
        <label class="text-xs text-zinc-600" for="telefono-modal">Teléfono</label>
        <input
          id="telefono-modal"
          class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
          placeholder="Opcional"
          bind:value={form.phone}
        />
      </div>
      <div class="space-y-4 pt-2">
        {#each form.items as item, i}
          <fieldset class="space-y-2 rounded-lg border border-zinc-200 p-3">
            <div class="flex items-start justify-between gap-2">
              <legend class="text-xs font-medium text-zinc-600">Producto {i + 1}</legend>
              {#if form.items.length > 1}
                <button
                  type="button"
                  class="text-xs text-red-600 hover:underline"
                  onclick={() => removeItem(i)}
                  aria-label="Eliminar producto">Eliminar</button
                >
              {/if}
            </div>
            <div class="grid gap-1">
              <input
                class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
                placeholder="Descripción"
                bind:value={item.product}
                list="product-suggestions-modal"
                required
              />
              {#if productSuggestions?.length && i === 0}
                <datalist id="product-suggestions-modal">
                  {#each productSuggestions as p}
                    <option value={p}></option>
                  {/each}
                </datalist>
              {/if}
              {#if productSuggestions?.length}
                <div class="flex flex-wrap gap-2 pt-1">
                  {#each productSuggestions.slice(0, 6) as p}
                    <button
                      type="button"
                      class="rounded-full border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50"
                      onclick={() => (item.product = p)}>{p}</button
                    >
                  {/each}
                </div>
              {/if}
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div class="grid gap-1">
                <label class="text-xs text-zinc-600" for={`cantidad-modal-${i}`}>Cantidad</label>
                <input
                  id={`cantidad-modal-${i}`}
                  class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
                  type="number"
                  min="1"
                  bind:value={item.quantity}
                  required
                />
              </div>
              <div class="grid gap-1">
                <label class="text-xs text-zinc-600" for={`unitprice-modal-${i}`}
                  >Precio unitario</label
                >
                <input
                  id={`unitprice-modal-${i}`}
                  class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
                  type="number"
                  step="0.01"
                  min="0"
                  bind:value={item.unitPrice}
                  required
                />
              </div>
            </div>
            <p class="text-right text-xs text-zinc-500">
              Subtotal: {(item.quantity * item.unitPrice).toFixed(2)}
              {#if bolivarRate}
                <span class="ml-1 text-[10px] text-zinc-400"
                  >(Bs {(item.quantity * item.unitPrice * bolivarRate).toFixed(2)})</span
                >
              {/if}
            </p>
          </fieldset>
        {/each}
        <div class="flex justify-end">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-3 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-300 active:scale-[.98]"
            onclick={addItem}>Añadir producto</button
          >
        </div>
        <div class="flex flex-col items-end text-sm font-medium text-zinc-700">
          <div>Total: <span class="ml-1">{total.toFixed(2)}</span></div>
          {#if bolivarRate}
            <div class="text-[10px] font-normal text-zinc-500">
              ≈ Bs {(total * bolivarRate).toFixed(2)}
            </div>
          {/if}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <input id="delivered-modal" type="checkbox" bind:checked={form.delivered} class="size-4" />
        <label for="delivered-modal" class="text-sm">Pagado</label>
      </div>
      <div class="grid gap-1">
        <label class="text-xs text-zinc-600" for="notas-modal">Notas</label>
        <textarea
          id="notas-modal"
          class="min-h-20 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
          placeholder="Opcional"
          bind:value={form.notes}
        ></textarea>
      </div>
      <!-- Action bar -->
      <div class="flex flex-wrap justify-end gap-3 pt-4">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-300 active:scale-[.97]"
          onclick={() => close()}>Cancelar</button
        >
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-400 px-4 py-2 text-sm font-medium text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40"
          class:bg-zinc-900={formValid}
          class:hover:bg-zinc-800={formValid}
          disabled={!formValid}>Guardar</button
        >
      </div>
    </form>
    {#if showConfirm}
      <!-- Unsaved confirmation overlay -->
      <div class="fixed inset-0 z-[1200] flex items-center justify-center px-4">
        <div
          class="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
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
                Descartar cambios
              </h3>
              <p class="text-xs leading-relaxed text-zinc-600">
                Tienes datos sin guardar en esta nueva venta. ¿Deseas cerrar y perderlos?
              </p>
            </header>
            <div class="flex flex-col gap-2 pt-2 sm:flex-row-reverse sm:justify-end">
              <button
                type="button"
                class="inline-flex flex-1 items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[.97]"
                onclick={cancelUnsavedPrompt}>Seguir editando</button
              >
              <button
                type="button"
                class="inline-flex flex-1 items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 transition ring-inset hover:bg-red-50 active:scale-[.97]"
                onclick={() => confirmUnsaved(close)}>Salir sin guardar</button
              >
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/snippet}

{#if open}
  <ModalPortal
    labelledBy="new-sale-modal-title"
    size="lg"
    beforeClose={() => {
      if (hasUserInput() && !ignoreUnsaved) {
        showConfirm = true;
        return false; // stop close, show custom dialog
      }
      ignoreUnsaved = false; // reset flag for next open
    }}
    onClose={() => {
      reset();
      showConfirm = false;
      ignoreUnsaved = false;
      oncancel?.();
    }}
    children={newSaleModal}
  />
{/if}

<style>
  .animate-fade-in {
    animation: fade-in 0.18s ease-out;
  }
  .animate-scale-in {
    animation: scale-in 0.22s cubic-bezier(0.16, 0.8, 0.24, 1);
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes scale-in {
    0% {
      opacity: 0;
      transform: scale(0.9) translateY(8px);
    }
    60% {
      opacity: 1;
      transform: scale(1.02) translateY(0);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
