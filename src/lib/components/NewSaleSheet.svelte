<script lang="ts">
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

  function reset() {
    form = {
      debtorName: '',
      phone: '',
      items: [{ product: '', quantity: 1, unitPrice: 0 }],
      delivered: false,
      notes: '',
    };
  }

  function onSubmit(e: Event) {
    e.preventDefault();
    if (!form.debtorName?.trim()) return;
    if (!form.items.length) return;
    for (const it of form.items) {
      if (!it.product?.trim()) return;
      if (it.quantity <= 0) return;
      if (it.unitPrice < 0) return;
    }
    onsubmit?.(form);
    reset();
  }

  function addItem() {
    form.items.push({ product: '', quantity: 1, unitPrice: 0 });
  }

  function removeItem(index: number) {
    if (form.items.length === 1) return; // keep at least one
    form.items.splice(index, 1);
  }

  const total = $derived(form.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0));
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex">
    <button
      type="button"
      class="flex-1 bg-black/40"
      onclick={() => oncancel?.()}
      aria-label="Cerrar"
    ></button>
    <aside
      class="ml-auto h-full w-full max-w-md overflow-y-auto rounded-l-2xl bg-white p-4 shadow-xl lg:max-w-xl lg:p-6"
    >
      <header class="flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold">Nueva venta</h2>
        <button
          type="button"
          class="grid size-8 place-content-center rounded-lg hover:bg-zinc-100"
          onclick={() => oncancel?.()}
          aria-label="Cerrar">✕</button
        >
      </header>

      <form class="mt-4 space-y-4" onsubmit={onSubmit}>
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="cliente">Cliente</label>
          <input
            id="cliente"
            class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
            placeholder="Nombre"
            bind:value={form.debtorName}
            list="debtor-suggestions"
            required
          />
          {#if debtorSuggestions?.length}
            <datalist id="debtor-suggestions">
              {#each debtorSuggestions as name}
                <option value={name}></option>
              {/each}
            </datalist>
          {/if}
        </div>
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="telefono">Teléfono</label>
          <input
            id="telefono"
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
                  list="product-suggestions"
                  required
                />
                {#if productSuggestions?.length && i === 0}
                  <datalist id="product-suggestions">
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
                  <label class="text-xs text-zinc-600" for={`cantidad-${i}`}>Cantidad</label>
                  <input
                    id={`cantidad-${i}`}
                    class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
                    type="number"
                    min="1"
                    bind:value={item.quantity}
                    required
                  />
                </div>
                <div class="grid gap-1">
                  <label class="text-xs text-zinc-600" for={`unitprice-${i}`}>Precio unitario</label
                  >
                  <input
                    id={`unitprice-${i}`}
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
                Subtotal: ${(item.quantity * item.unitPrice).toFixed(2)}
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
          <input id="delivered" type="checkbox" bind:checked={form.delivered} class="size-4" />
          <label for="delivered" class="text-sm">Pagado</label>
        </div>
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="notas">Notas</label>
          <textarea
            id="notas"
            class="min-h-20 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
            placeholder="Opcional"
            bind:value={form.notes}
          ></textarea>
        </div>

        <div class="flex gap-3 pt-2">
          <button
            type="button"
            class="inline-flex flex-1 items-center justify-center rounded-lg bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-300 active:scale-[.98]"
            onclick={() => oncancel?.()}>Cancelar</button
          >
          <button
            type="submit"
            class="inline-flex flex-1 items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[.98]"
            >Guardar</button
          >
        </div>
      </form>
    </aside>
  </div>
{/if}
