<script lang="ts">
  import type { NewSaleForm } from '$lib/core/types';
  import { showToast } from '$lib/core/toast';

  // Reusable form component for creating a new sale
  // Exposes methods via component instance: hasUserInput(), reset()
  let {
    debtorSuggestions = [],
    productSuggestions = [],
    bolivarRate = null,
    submitLabel = 'Guardar',
    cancelLabel = 'Cancelar',
    variant = 'modal', // used only to differentiate element ids / datalist
    onSubmit,
    onCancel,
  }: {
    debtorSuggestions?: string[];
    productSuggestions?: string[];
    bolivarRate?: number | null;
    submitLabel?: string;
    cancelLabel?: string;
    variant?: 'modal' | 'sheet';
    onSubmit?: (form: NewSaleForm) => void;
    onCancel?: () => void;
  } = $props();

  // Eliminado createEventDispatcher (deprecated pattern). Se usa sólo callback onSubmit.

  let form: NewSaleForm = $state({
    debtorName: '',
    phone: '',
    items: [{ product: '', quantity: 1, unitPrice: 0 }],
    delivered: false,
    notes: '',
    currency: 'USD', // será reemplazado por preferencia si existe
  });

  // Clave de localStorage para preferencia de moneda
  const PREF_KEY = 'default-currency-v1';

  // Cargar preferencia inicial al montar (siempre que no se haya modificado manualmente todavía)
  // Carga diferida de preferencia (evita warnings de captura inicial)
  $effect(() => {
    if (typeof window === 'undefined') return;
    // Sólo ejecutar si aún está en USD inicial y no se cambió manualmente
    if (form.currency !== 'USD') return;
    const stored = localStorage.getItem(PREF_KEY);
    if (stored === 'USD' || stored === 'VES') {
      form.currency = stored;
    }
  });

  // Efecto para validar selección de moneda y persistir preferencia
  let lastCurrency: 'USD' | 'VES' = 'USD';
  $effect(() => {
    if (form.currency === lastCurrency) return;
    // Si intenta pasar a VES sin tasa disponible revertimos y avisamos
    if (form.currency === 'VES' && (!bolivarRate || bolivarRate <= 0)) {
      showToast('No hay tasa disponible para convertir a Bs.', { variant: 'warn' });
      form.currency = lastCurrency; // revertir
      return;
    }
    lastCurrency = (form.currency as 'USD' | 'VES') ?? 'USD';
    // Guardar preferencia
    if (typeof window !== 'undefined') {
      try {
        if (form.currency) localStorage.setItem(PREF_KEY, form.currency);
      } catch {}
    }
  });

  function addItem() {
    form.items.push({ product: '', quantity: 1, unitPrice: 0 });
  }
  function removeItem(index: number) {
    if (form.items.length === 1) return;
    form.items.splice(index, 1);
  }

  // public helpers (accessed by parent with bind:this)
  export function reset() {
    form = {
      debtorName: '',
      phone: '',
      items: [{ product: '', quantity: 1, unitPrice: 0 }],
      delivered: false,
      notes: '',
      currency: 'USD',
    };
  }
  export function hasUserInput(): boolean {
    if (form.debtorName.trim()) return true;
    if (form.phone?.trim()) return true;
    if (form.notes?.trim()) return true;
    if (form.delivered) return true;
    if (form.items.length !== 1) return true;
    const only = form.items[0];
    if (only.product.trim()) return true;
    if (only.quantity !== 1) return true;
    if (only.unitPrice !== 0) return true;
    if (form.currency && form.currency !== 'USD') return true; // cambio en la moneda
    return false;
  }

  // Validation rules (single source of truth for both previous components)
  function computeValid(): boolean {
    // Reglas:
    // 1. Nombre requerido
    // 2. Al menos un item "activo" (tiene algún cambio respecto al default) con producto no vacío
    // 3. Cantidad > 0
    // 4. Permitimos precio 0 (ej. regalo/promoción) => unitPrice >= 0
    if (!form.debtorName.trim()) return false;
    const active = form.items.filter(
      (it) => it.product.trim() || it.quantity !== 1 || it.unitPrice !== 0,
    );
    if (!active.length) return false;
    return active.every((it) => it.product.trim() && it.quantity > 0 && it.unitPrice >= 0);
  }
  const formValid = $derived(computeValid());
  // Total siempre en la moneda seleccionada
  const total = $derived(form.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0));
  const totalUSD = $derived(
    form.currency === 'USD' ? total : bolivarRate ? total / bolivarRate : total,
  );
  const totalVES = $derived(
    form.currency === 'VES' ? total : bolivarRate ? total * bolivarRate : total,
  );

  export function getForm(): NewSaleForm {
    return form;
  }

  function submit(e: Event) {
    e.preventDefault();
    if (!formValid) return;
    onSubmit?.(form);
  }
</script>

<form class="space-y-5" onsubmit={submit}>
  <div class="grid gap-1">
    <label class="text-xs text-zinc-600" for={`cliente-${variant}`}>Cliente</label>
    <input
      id={`cliente-${variant}`}
      class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
      placeholder="Nombre"
      bind:value={form.debtorName}
      list={`debtor-suggestions-${variant}`}
      required
    />
    {#if debtorSuggestions?.length}
      <datalist id={`debtor-suggestions-${variant}`}>
        {#each debtorSuggestions as name}
          <option value={name}></option>
        {/each}
      </datalist>
    {/if}
  </div>
  <div class="grid gap-1">
    <label class="text-xs text-zinc-600" for={`telefono-${variant}`}>Teléfono</label>
    <input
      id={`telefono-${variant}`}
      class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
      placeholder="Opcional"
      bind:value={form.phone}
    />
  </div>
  <div class="space-y-4 pt-2">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <p class="text-xs text-zinc-600">Items</p>
      <div class="grid gap-1">
        <label
          class="text-[10px] font-medium tracking-wide text-zinc-500 uppercase"
          for={`currency-${variant}`}>Moneda</label
        >
        <select
          id={`currency-${variant}`}
          class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs ring-zinc-300 outline-none focus:ring-2"
          bind:value={form.currency}
        >
          <option value="USD">Dólar ($)</option>
          <option value="VES">Bolívares (Bs)</option>
        </select>
      </div>
    </div>
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
            list={`product-suggestions-${variant}`}
            required
          />
          {#if productSuggestions?.length && i === 0}
            <datalist id={`product-suggestions-${variant}`}>
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
            <label class="text-xs text-zinc-600" for={`cantidad-${variant}-${i}`}>Cantidad</label>
            <input
              id={`cantidad-${variant}-${i}`}
              class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
              type="number"
              min="1"
              bind:value={item.quantity}
              required
            />
          </div>
          <div class="grid gap-1">
            <label class="text-xs text-zinc-600" for={`unitprice-${variant}-${i}`}
              >Precio unitario</label
            >
            <input
              id={`unitprice-${variant}-${i}`}
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
          Subtotal:
          {#if form.currency === 'USD'}
            $ {(item.quantity * item.unitPrice).toFixed(2)}
            {#if bolivarRate}
              <span class="ml-1 text-[10px] text-zinc-400"
                >(Bs {(item.quantity * item.unitPrice * bolivarRate).toFixed(2)})</span
              >
            {/if}
          {:else}
            Bs {(item.quantity * item.unitPrice).toFixed(2)}
            {#if bolivarRate}
              <span class="ml-1 text-[10px] text-zinc-400"
                >($ {((item.quantity * item.unitPrice) / bolivarRate).toFixed(2)})</span
              >
            {/if}
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
      {#if form.currency === 'USD'}
        <div>Total: <span class="ml-1">$ {totalUSD.toFixed(2)}</span></div>
        {#if bolivarRate}
          <div class="text-[10px] font-normal text-zinc-500">≈ Bs {totalVES.toFixed(2)}</div>
        {/if}
      {:else}
        <div>Total: <span class="ml-1">Bs {totalVES.toFixed(2)}</span></div>
        {#if bolivarRate}
          <div class="text-[10px] font-normal text-zinc-500">≈ $ {totalUSD.toFixed(2)}</div>
        {/if}
      {/if}
    </div>
  </div>
  <div class="flex items-center gap-2">
    <input
      id={`delivered-${variant}`}
      type="checkbox"
      bind:checked={form.delivered}
      class="size-4"
    />
    <label for={`delivered-${variant}`} class="text-sm">Pagado</label>
  </div>
  <div class="grid gap-1">
    <label class="text-xs text-zinc-600" for={`notas-${variant}`}>Notas</label>
    <textarea
      id={`notas-${variant}`}
      class="min-h-20 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm ring-zinc-300 outline-none focus:ring-2"
      placeholder="Opcional"
      bind:value={form.notes}
    ></textarea>
  </div>
  <div class="flex flex-wrap justify-end gap-3 pt-4">
    <button
      type="button"
      class="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-300 active:scale-[.97]"
      onclick={onCancel}>{cancelLabel}</button
    >
    <button
      type="submit"
      class="inline-flex items-center justify-center rounded-lg bg-zinc-400 px-4 py-2 text-sm font-medium text-white transition active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-40"
      class:bg-zinc-900={formValid}
      class:hover:bg-zinc-800={formValid}
      disabled={!formValid}>{submitLabel}</button
    >
  </div>
</form>

<style>
  /* No extra styles; animations come from parent components */
</style>
