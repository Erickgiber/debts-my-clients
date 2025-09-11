<script lang="ts">
  import type { NewSaleForm } from '$lib/core/types';

  let {
    open = false,
    onsubmit,
    oncancel,
    debtorSuggestions = [],
    productSuggestions = [],
  }: {
    open?: boolean;
    onsubmit?: (detail: NewSaleForm) => void;
    oncancel?: () => void;
    debtorSuggestions?: string[];
    productSuggestions?: string[];
  } = $props();

  let form: NewSaleForm = $state({
    debtorName: '',
    phone: '',
    product: '',
    quantity: 1,
    unitPrice: 0,
    delivered: false,
    notes: '',
  });

  function reset() {
    form = {
      debtorName: '',
      phone: '',
      product: '',
      quantity: 1,
      unitPrice: 0,
      delivered: false,
      notes: '',
    };
  }

  function onSubmit(e: Event) {
    e.preventDefault();
    if (
      !form.debtorName?.trim() ||
      !form.product?.trim() ||
      form.quantity <= 0 ||
      form.unitPrice < 0
    )
      return;
    onsubmit?.(form);
    reset();
  }
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
      class="ml-auto h-full w-full max-w-md overflow-y-auto rounded-l-2xl bg-white p-4 shadow-xl"
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
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="producto">Producto</label>
          <input
            id="producto"
            class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
            placeholder="Descripción"
            bind:value={form.product}
            list="product-suggestions"
            required
          />
          {#if productSuggestions?.length}
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
                  onclick={() => (form.product = p)}>{p}</button
                >
              {/each}
            </div>
          {/if}
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-1">
            <label class="text-xs text-zinc-600" for="cantidad">Cantidad</label>
            <input
              id="cantidad"
              class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
              type="number"
              min="1"
              bind:value={form.quantity}
              required
            />
          </div>
          <div class="grid gap-1">
            <label class="text-xs text-zinc-600" for="unitprice">Precio unitario</label>
            <input
              id="unitprice"
              class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
              type="number"
              step="0.01"
              min="0"
              bind:value={form.unitPrice}
              required
            />
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
