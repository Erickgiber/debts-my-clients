<script lang="ts">
  import type { Sale, SaleItem } from '$lib/core/types';
  import { currency, daysSince, remainingAmount } from '$lib/core/utils';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ partialpayment: { saleId: string; amount: number } }>();

  let {
    sale,
    debtorName,
    debtorPhone,
    onMarkDelivered,
    onEdit,
    bolivarRate,
  }: {
    sale: Sale;
    debtorName: string;
    debtorPhone?: string;
    bolivarRate?: number | null;
    onMarkDelivered: (id: string) => void;
    onEdit?: (
      saleId: string,
      payload: {
        items: Array<Pick<SaleItem, 'id' | 'product' | 'quantity' | 'unitPrice'>>;
        paid: boolean;
        debtorName?: string;
        debtorPhone?: string;
      },
    ) => void;
  } = $props();

  let editing = $state(false);
  let addingPayment = $state(false);
  let partialAmount = $state('');
  let draftItems = $state<Array<Pick<SaleItem, 'id' | 'product' | 'quantity' | 'unitPrice'>>>([]);
  let draftPaid = $state(false);
  let draftDebtorName = $state('');
  let draftDebtorPhone = $state('');

  function startEdit() {
    draftItems = sale.items.map((it) => ({
      id: it.id,
      product: it.product,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    }));
    draftPaid = sale.status === 'delivered';
    draftDebtorName = debtorName;
    draftDebtorPhone = debtorPhone ?? '';
    editing = true;
  }
  function cancelEdit() {
    editing = false;
  }
  function saveEdit() {
    // simple validation
    for (const it of draftItems) {
      if (!it.product?.trim()) return;
      if (Number(it.quantity) < 1) return;
      if (Number(it.unitPrice) < 0) return;
    }
    const name = draftDebtorName?.trim();
    const nameChanged = !!(name && name !== debtorName);
    const phone = draftDebtorPhone.trim();
    const phoneChanged = phone !== (debtorPhone ?? '');
    onEdit?.(sale.id, {
      items: draftItems,
      paid: draftPaid,
      debtorName: nameChanged ? name : undefined,
      debtorPhone: phoneChanged ? phone : undefined,
      // We'll overload by attaching a special symbol on window? Simpler: mutate globally after callback from parent. Parent currently only accepts debtorName.
    });
    editing = false;
  }

  function startAddPayment() {
    addingPayment = true;
    partialAmount = '';
  }
  function cancelAddPayment() {
    addingPayment = false;
    partialAmount = '';
  }
  function confirmAddPayment() {
    const value = Number(partialAmount);
    if (!Number.isFinite(value) || value <= 0) return;
    dispatch('partialpayment', { saleId: sale.id, amount: value });
    addingPayment = false;
    partialAmount = '';
  }

  function addDraftItem() {
    draftItems.push({ id: crypto.randomUUID(), product: '', quantity: 1, unitPrice: 0 });
  }
  function removeDraftItem(id: string) {
    if (draftItems.length === 1) return; // keep at least one
    draftItems = draftItems.filter((it) => it.id !== id);
  }

  const draftTotal = $derived(
    draftItems.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0),
  );

  /**
   * Normaliza números venezolanos al formato internacional (+58XXXXXXXXXX).
   * Pensado para móviles y fijos (0AAAxxxxxxx / 0ABxxxxxxx / 04AXxxxxxxx).
   * Estrategia:
   * 1. Limpia caracteres no numéricos (mantiene un '+' inicial si existe).
   * 2. Si ya está en formato +58 y tiene 10 dígitos nacionales, se devuelve igual.
   * 3. Acepta variantes: 58XXXXXXXXXX, 0XXXXXXXXXX, 04XXXXXXXXX, 0AA..., etc.
   * 4. Elimina ceros troncales iniciales y reconstruye con +58.
   * 5. Si no puede garantizar exactitud, retorna una versión segura (solo dígitos) intentando conservar los últimos 10.
   */
  function replaceNumberPhone(phone: string): string {
    if (!phone) return '';

    // Limpiar: dejar dígitos y posible '+' inicial
    let raw = phone.trim().replace(/[^\d+]/g, '');

    // Ya en formato correcto +58 + 10 dígitos
    if (/^\+58\d{10}$/.test(raw)) return raw;

    // Quitar '+' para normalizar evaluaciones
    raw = raw.replace(/^\+/, '');

    // Caso 58 + 10 dígitos
    if (/^58\d{10}$/.test(raw)) return `+${raw}`;

    // Eliminar ceros troncales (uno o más)
    raw = raw.replace(/^0+/, '');

    // Si después queda 10 dígitos: asumir nacional sin código país
    if (/^\d{10}$/.test(raw)) return `+58${raw}`;

    // Caso atípico: sobran dígitos pero contiene una subcadena final válida de 10 dígitos
    const tail10 = raw.match(/(\d{10})$/);
    if (tail10) return `+58${tail10[1]}`;

    // Fallback: extraer dígitos; si detectamos 58 delante los conservamos
    const digits = raw.replace(/\D/g, '');
    if (/^58\d{10}$/.test(digits)) return `+${digits}`;
    if (digits.length >= 10) return `+58${digits.slice(-10)}`;

    // No hay suficiente información fiable
    return '';
  }
</script>

<article class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
  <header class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold">{debtorName}</h3>
      <p class="text-xs text-zinc-500">
        {new Date(sale.createdAt).toLocaleString()}
      </p>
    </div>
    <div class="inline-flex items-center gap-2">
      {#if sale.status === 'pending'}
        <span
          class="inline-flex items-center gap-2 rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-800"
        >
          Pendiente
        </span>
      {:else}
        <span
          class="inline-flex items-center gap-2 rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-800"
        >
          Pagado
        </span>
      {/if}
      {#if !editing}
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-300 active:scale-[.98]"
          onclick={startEdit}
          aria-label="Editar venta">Editar</button
        >
      {/if}
    </div>
  </header>

  {#if editing}
    <div class="mt-3 space-y-2 text-sm">
      <div class="grid gap-1">
        <label class="text-xs text-zinc-600" for={`debtor-${sale.id}`}>Cliente</label>
        <input
          id={`debtor-${sale.id}`}
          class="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm"
          bind:value={draftDebtorName}
        />
      </div>
      <div class="grid gap-1">
        <label class="text-xs text-zinc-600" for={`debtor-phone-${sale.id}`}>Teléfono</label>
        <input
          id={`debtor-phone-${sale.id}`}
          class="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm"
          placeholder="Opcional"
          bind:value={draftDebtorPhone}
        />
      </div>
      {#if sale.status !== 'pending'}
        <div class="flex items-center gap-2">
          <input id={`paid-${sale.id}`} type="checkbox" class="size-4" bind:checked={draftPaid} />
          <label class="text-sm" for={`paid-${sale.id}`}>Pagado</label>
        </div>
      {/if}
      {#each draftItems as it, i (it.id)}
        <div class="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2">
          <input
            class="rounded-lg border border-zinc-200 px-2 py-1 text-sm"
            bind:value={draftItems[i].product}
            placeholder="Producto"
          />
          <input
            class="w-16 rounded-lg border border-zinc-200 px-2 py-1 text-sm"
            type="number"
            min="1"
            bind:value={draftItems[i].quantity}
          />
          <input
            class="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-sm"
            type="number"
            min="0"
            step="0.01"
            bind:value={draftItems[i].unitPrice}
          />
          <span class="w-20 text-right text-xs text-zinc-600"
            >{currency(Number(draftItems[i].quantity) * Number(draftItems[i].unitPrice))}</span
          >
          <button
            type="button"
            class="text-xs text-red-600 hover:underline"
            aria-label="Eliminar"
            onclick={() => removeDraftItem(it.id)}
            disabled={draftItems.length === 1}>✕</button
          >
        </div>
      {/each}
      <div class="flex items-center justify-between pt-2">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-300"
          onclick={addDraftItem}>Añadir producto</button
        >
        <span class="text-xs text-zinc-600">Total: <strong>{currency(draftTotal)}</strong></span>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-300"
          onclick={cancelEdit}>Cancelar</button
        >
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
          onclick={saveEdit}>Guardar</button
        >
      </div>
    </div>
  {:else}
    <div class="mt-3 text-sm">
      <ul class="space-y-1">
        {#each sale.items as it}
          <li class="flex flex-col">
            <div class="flex justify-between">
              <span class="text-zinc-700">{it.product} × {it.quantity}</span>
              <span class="font-medium">{currency(it.unitPrice * it.quantity)}</span>
            </div>
            {#if bolivarRate}
              <div class="flex justify-between text-[10px] text-zinc-500">
                <span class="opacity-0">≈</span>
                <span>
                  Bs {(it.unitPrice * it.quantity * bolivarRate).toFixed(2)}
                </span>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <footer class="mt-3 flex items-center justify-between">
    <div class="space-y-0.5 text-xs text-zinc-600">
      <div>
        Total: <span class="font-semibold text-zinc-900">{currency(sale.total)}</span>
      </div>
      {#if sale.paid}
        <div>
          Pagado: <span class="font-medium">{currency(sale.paid)}</span>
          {#if bolivarRate}
            <span class="ml-1 text-[10px] text-zinc-500"
              >(Bs {(sale.paid * bolivarRate).toFixed(2)})</span
            >
          {/if}
        </div>
      {/if}
      {#if remainingAmount(sale) > 0}
        <div>
          Resta: <span class="font-medium">{currency(remainingAmount(sale))}</span>
          {#if bolivarRate}
            <span class="ml-1 text-[10px] text-zinc-500"
              >(Bs {(remainingAmount(sale) * bolivarRate).toFixed(2)})</span
            >
          {/if}
        </div>
      {/if}
      {#if bolivarRate}
        <div class="text-[10px] text-zinc-500">≈ Bs {(sale.total * bolivarRate).toFixed(2)}</div>
      {/if}
      {#if sale.status === 'pending'}
        • {daysSince(sale.createdAt)} días pendiente de pago
      {:else if sale.deliveredAt}
        • Pagado hace {daysSince(sale.deliveredAt)} días
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if sale.status === 'pending' && !editing}
        {#if !addingPayment}
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-blue-500 active:scale-[.98]"
            onclick={startAddPayment}>Abonar</button
          >
        {:else}
          <div class="flex items-center gap-1">
            <input
              type="number"
              min="0.01"
              step="0.01"
              class="w-24 rounded-lg border border-zinc-300 px-2 py-1 text-xs"
              placeholder="$"
              bind:value={partialAmount}
            />
            <button
              type="button"
              class="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-500"
              onclick={confirmAddPayment}
              disabled={!partialAmount}>OK</button
            >
            <button
              type="button"
              class="rounded-lg bg-zinc-200 px-2 py-1 text-xs font-medium hover:bg-zinc-300"
              onclick={cancelAddPayment}>✕</button
            >
          </div>
        {/if}
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500 active:scale-[.98]"
          onclick={() => onMarkDelivered(sale.id)}>Marcar pagado</button
        >
      {/if}
      {#if debtorPhone && !editing}
        <a
          class="inline-flex items-center justify-center"
          href={`https://wa.me/${replaceNumberPhone(debtorPhone)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="23.82" height="24" viewBox="0 0 256 258">
            <defs>
              <linearGradient id="SVGBRLHCcSy" x1="50%" x2="50%" y1="100%" y2="0%">
                <stop offset="0%" stop-color="#1faf38" />
                <stop offset="100%" stop-color="#60d669" />
              </linearGradient>
              <linearGradient id="SVGHW6lecxh" x1="50%" x2="50%" y1="100%" y2="0%">
                <stop offset="0%" stop-color="#f9f9f9" />
                <stop offset="100%" stop-color="#fff" />
              </linearGradient>
            </defs>
            <path
              fill="url(#SVGBRLHCcSy)"
              d="M5.463 127.456c-.006 21.677 5.658 42.843 16.428 61.499L4.433 252.697l65.232-17.104a123 123 0 0 0 58.8 14.97h.054c67.815 0 123.018-55.183 123.047-123.01c.013-32.867-12.775-63.773-36.009-87.025c-23.23-23.25-54.125-36.061-87.043-36.076c-67.823 0-123.022 55.18-123.05 123.004"
            />
            <path
              fill="url(#SVGHW6lecxh)"
              d="M1.07 127.416c-.007 22.457 5.86 44.38 17.014 63.704L0 257.147l67.571-17.717c18.618 10.151 39.58 15.503 60.91 15.511h.055c70.248 0 127.434-57.168 127.464-127.423c.012-34.048-13.236-66.065-37.3-90.15C194.633 13.286 162.633.014 128.536 0C58.276 0 1.099 57.16 1.071 127.416m40.24 60.376l-2.523-4.005c-10.606-16.864-16.204-36.352-16.196-56.363C22.614 69.029 70.138 21.52 128.576 21.52c28.3.012 54.896 11.044 74.9 31.06c20.003 20.018 31.01 46.628 31.003 74.93c-.026 58.395-47.551 105.91-105.943 105.91h-.042c-19.013-.01-37.66-5.116-53.922-14.765l-3.87-2.295l-40.098 10.513z"
            />
            <path
              fill="#fff"
              d="M96.678 74.148c-2.386-5.303-4.897-5.41-7.166-5.503c-1.858-.08-3.982-.074-6.104-.074c-2.124 0-5.575.799-8.492 3.984c-2.92 3.188-11.148 10.892-11.148 26.561s11.413 30.813 13.004 32.94c1.593 2.123 22.033 35.307 54.405 48.073c26.904 10.609 32.379 8.499 38.218 7.967c5.84-.53 18.844-7.702 21.497-15.139c2.655-7.436 2.655-13.81 1.859-15.142c-.796-1.327-2.92-2.124-6.105-3.716s-18.844-9.298-21.763-10.361c-2.92-1.062-5.043-1.592-7.167 1.597c-2.124 3.184-8.223 10.356-10.082 12.48c-1.857 2.129-3.716 2.394-6.9.801c-3.187-1.598-13.444-4.957-25.613-15.806c-9.468-8.442-15.86-18.867-17.718-22.056c-1.858-3.184-.199-4.91 1.398-6.497c1.431-1.427 3.186-3.719 4.78-5.578c1.588-1.86 2.118-3.187 3.18-5.311c1.063-2.126.531-3.986-.264-5.579c-.798-1.593-6.987-17.343-9.819-23.64"
            />
          </svg>
        </a>
      {/if}
    </div>
  </footer>
</article>
