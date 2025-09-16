<script lang="ts">
  import type { Sale, SaleItem } from '$lib/core/types';
  import { currency, daysSince, remainingAmount } from '$lib/core/utils';
  import ModalPortal from '$lib/components/SaleModalPortal.svelte';
  import { showToast } from '$lib/core/toast';
  import { appMode } from '$lib/core/mode';

  let mode = $state<'sales' | 'debts'>('sales');
  $effect.pre(() => {
    const unsub = appMode.subscribe((m) => (mode = m));
    return () => unsub();
  });

  let {
    sale,
    debtorName,
    debtorPhone,
    onMarkDelivered,
    onEdit,
    bolivarRate,
    onPartialPayment,
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
        currency?: 'USD' | 'VES';
      },
    ) => void;
    onPartialPayment?: (saleId: string, amount: number) => void;
  } = $props();

  let editing = $state(false);
  let addingPayment = $state(false);
  let partialAmount = $state('');
  let partialCurrency = $state<'USD' | 'VES'>('USD');
  let draftItems = $state<Array<Pick<SaleItem, 'id' | 'product' | 'quantity' | 'unitPrice'>>>([]);
  let draftPaid = $state(false);
  let draftDebtorName = $state('');
  let draftDebtorPhone = $state('');
  let draftCurrency = $state<'USD' | 'VES'>(sale.currency || 'USD');
  // Mantenemos un valor simple (no $state) para la moneda anterior
  let lastCurrency: 'USD' | 'VES' = sale.currency || 'USD';
  let isDesktop = $state(false);
  // Modal para ver todos los productos cuando hay más de 2
  let showingAllItems = $state(false);

  // Detect desktop
  $effect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1140px)');
    const update = () => (isDesktop = mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  });

  // Con ModalPortal ya no necesitamos manejar scroll lock, focus trap ni Escape aquí.

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
    draftCurrency = sale.currency || 'USD';
    editing = true;
  }
  function cancelEdit() {
    editing = false;
  }
  function saveEdit() {
    for (const it of draftItems) {
      if (!it.product?.trim()) return;
      if (Number(it.quantity) < 1) return;
      if (Number(it.unitPrice) < 0) return;
    }
    const name = draftDebtorName?.trim();
    const nameChanged = !!(name && name !== debtorName);
    const phone = draftDebtorPhone.trim();
    const phoneChanged = phone !== (debtorPhone ?? '');
    // Preparar items: si moneda es VES, enviar unitPrice en la unidad mostrada (VES) y se convertirá en App.
    onEdit?.(sale.id, {
      items: draftItems.map((it) => ({ ...it })),
      paid: draftPaid,
      debtorName: nameChanged ? name : undefined,
      debtorPhone: phoneChanged ? phone : undefined,
      currency: draftCurrency,
    });
    editing = false;
  }

  // Conversión automática al cambiar moneda en modo edición.
  $effect(() => {
    if (!editing) return;
    if (draftCurrency === lastCurrency) return;
    // Necesitamos tasa para convertir.
    if (!bolivarRate || bolivarRate <= 0) {
      // Revertir cambio si no tenemos tasa.
      showToast('No hay tasa disponible para convertir a Bs.', { variant: 'warn' });
      draftCurrency = lastCurrency;
      return;
    }
    if (lastCurrency === 'USD' && draftCurrency === 'VES') {
      // USD -> VES: multiplicar
      draftItems = draftItems.map((it) => ({
        ...it,
        unitPrice: Number(it.unitPrice) * bolivarRate,
      }));
    } else if (lastCurrency === 'VES' && draftCurrency === 'USD') {
      // VES -> USD: dividir
      draftItems = draftItems.map((it) => ({
        ...it,
        unitPrice: bolivarRate ? Number(it.unitPrice) / bolivarRate : Number(it.unitPrice),
      }));
    }
    lastCurrency = draftCurrency;
    // Persistir preferencia global
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('default-currency-v1', draftCurrency);
      } catch {}
    }
  });

  function startAddPayment() {
    addingPayment = true;
    partialAmount = '';
    partialCurrency = sale.currency || 'USD';
  }
  function cancelAddPayment() {
    addingPayment = false;
    partialAmount = '';
  }
  function confirmAddPayment() {
    const value = Number(partialAmount);
    if (!Number.isFinite(value) || value <= 0) return;
    // Convert if user entered in VES (needs bolivarRate)
    let usdValue = value;
    if (partialCurrency === 'VES') {
      if (!bolivarRate || bolivarRate <= 0) return; // no tasa -> no permitir
      usdValue = value / bolivarRate;
    }
    onPartialPayment?.(sale.id, usdValue);
    addingPayment = false;
    partialAmount = '';
  }
  function addDraftItem() {
    draftItems.push({ id: crypto.randomUUID(), product: '', quantity: 1, unitPrice: 0 });
  }
  function removeDraftItem(id: string) {
    if (draftItems.length === 1) return;
    draftItems = draftItems.filter((it) => it.id !== id);
  }

  const draftTotal = $derived(
    draftItems.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0),
  );

  function replaceNumberPhone(phone: string): string {
    if (!phone) return '';
    let raw = phone.trim().replace(/[^\d+]/g, '');
    if (/^\+58\d{10}$/.test(raw)) return raw;
    raw = raw.replace(/^\+/, '');
    if (/^58\d{10}$/.test(raw)) return `+${raw}`;
    raw = raw.replace(/^0+/, '');
    if (/^\d{10}$/.test(raw)) return `+58${raw}`;
    const tail10 = raw.match(/(\d{10})$/);
    if (tail10) return `+58${tail10[1]}`;
    const digits = raw.replace(/\D/g, '');
    if (/^58\d{10}$/.test(digits)) return `+${digits}`;
    if (digits.length >= 10) return `+58${digits.slice(-10)}`;
    return '';
  }

  function attemptDiscard(): boolean {
    const dirty =
      draftDebtorName.trim() !== debtorName.trim() ||
      (debtorPhone ?? '') !== draftDebtorPhone.trim() ||
      draftPaid !== (sale.status === 'delivered') ||
      draftItems.some((it, idx) => {
        const orig = sale.items[idx];
        if (!orig) return true;
        return (
          it.product !== orig.product ||
          Number(it.quantity) !== orig.quantity ||
          Number(it.unitPrice) !== orig.unitPrice
        );
      }) ||
      sale.items.length !== draftItems.length;
    if (dirty) {
      if (!confirm('Hay cambios sin guardar. ¿Cerrar de todos modos?')) return false;
    }
    return true;
  }

  // central isDirty derived for reuse
  const isDirty = $derived(
    draftDebtorName.trim() !== debtorName.trim() ||
      (debtorPhone ?? '') !== draftDebtorPhone.trim() ||
      draftPaid !== (sale.status === 'delivered') ||
      draftItems.some((it, idx) => {
        const orig = sale.items[idx];
        if (!orig) return true;
        return (
          it.product !== orig.product ||
          Number(it.quantity) !== orig.quantity ||
          Number(it.unitPrice) !== orig.unitPrice
        );
      }) ||
      sale.items.length !== draftItems.length ||
      draftCurrency !== (sale.currency || 'USD'),
  );

  function restoreDraft() {
    if (!isDirty) return;
    draftItems = sale.items.map((it) => ({
      id: it.id,
      product: it.product,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    }));
    draftPaid = sale.status === 'delivered';
    draftDebtorName = debtorName;
    draftDebtorPhone = debtorPhone ?? '';
    draftCurrency = sale.currency || 'USD';
  }

  // Pending amount with tiny tolerance to avoid floating point issues hiding the button
  const pendingRaw = $derived(remainingAmount(sale));
  const pendingAmount = $derived(pendingRaw > 0.0001 ? pendingRaw : 0);
  const normalizedPhone = $derived(debtorPhone ? replaceNumberPhone(debtorPhone) : '');
  // Validación para modal de edición: requerimos nombre y cada item válido
  const isEditValid = $derived(
    draftDebtorName.trim().length > 0 &&
      draftItems.length > 0 &&
      draftItems.every(
        (it) =>
          it.product.trim().length > 0 && Number(it.quantity) > 0 && Number(it.unitPrice) >= 0,
      ),
  );

  function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function buildWhatsAppMessage(): string {
    if (!pendingAmount) return '';
    const usd = currency(pendingAmount);
    const bs = bolivarRate ? (pendingAmount * bolivarRate).toFixed(2) : null;
    const namePart = debtorName ? ` ${debtorName.trim()}` : '';
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(
      today.getMonth() + 1,
    ).padStart(2, '0')}/${today.getFullYear()}`;
    let msg = `${greeting()}${namePart}. Le escribo el ${dateStr} para recordarle que mantiene un saldo pendiente de ${usd}`;
    if (bs) msg += ` (Bs ${bs})`;
    return msg;
  }

  const whatsappUrl = $derived(
    !normalizedPhone || !pendingAmount
      ? ''
      : (() => {
          const text = encodeURIComponent(buildWhatsAppMessage());
          return `https://wa.me/${normalizedPhone.replace('+', '')}?text=${text}`;
        })(),
  );
</script>

<article
  class={`anim-fade-in flex h-full flex-col rounded-xl border bg-white p-4 shadow-sm transition-colors dark:border-zinc-700 dark:bg-zinc-900/60 ${
    editing && isDesktop
      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-400/40'
      : 'border-zinc-200'
  }`}
>
  <header class="flex items-center justify-between">
    <div>
      <h3 class="flex items-center gap-2 text-sm font-semibold">
        <span>{debtorName}</span>
        {#if editing && isDesktop}
          <span
            class="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-blue-600"
            >EDITANDO</span
          >
        {/if}
      </h3>
      <p class="text-xs text-zinc-500 dark:text-zinc-400">
        {new Date(sale.createdAt).toLocaleString()}
      </p>
    </div>
    <div class="inline-flex items-center gap-2">
      {#if sale.status === 'pending'}
        <span
          class="inline-flex items-center gap-2 rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-800 dark:bg-amber-300/20 dark:text-amber-300"
        >
          Pendiente
        </span>
      {:else}
        <span
          class="inline-flex items-center gap-2 rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-300/20 dark:text-emerald-300"
        >
          Pagado
        </span>
      {/if}
      {#if !editing}
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-300 active:scale-[.98] dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
          onclick={startEdit}
          aria-label={mode === 'sales' ? 'Editar venta' : 'Editar deuda'}>Editar</button
        >
      {/if}
    </div>
  </header>

  {#if editing && !isDesktop}
    <div class="anim-scale-in mt-3 space-y-2 text-sm">
      <div class="grid gap-1">
        <label class="text-xs text-zinc-600 dark:text-zinc-300" for={`debtor-${sale.id}`}
          >Cliente</label
        >
        <input
          id={`debtor-${sale.id}`}
          class="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          bind:value={draftDebtorName}
        />
      </div>
      <div class="grid gap-1">
        <label class="text-xs text-zinc-600 dark:text-zinc-300" for={`currency-${sale.id}`}
          >Moneda</label
        >
        <select
          id={`currency-${sale.id}`}
          class="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          bind:value={draftCurrency}
        >
          <option value="USD">Dólar ($)</option>
          <option value="VES">Bolívares (Bs)</option>
        </select>
      </div>
      <div class="grid gap-1">
        <label class="text-xs text-zinc-600 dark:text-zinc-300" for={`debtor-phone-${sale.id}`}
          >Teléfono</label
        >
        <input
          id={`debtor-phone-${sale.id}`}
          class="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="Opcional"
          bind:value={draftDebtorPhone}
        />
      </div>
      {#if sale.status !== 'pending'}
        <div class="flex items-center gap-2">
          <input id={`paid-${sale.id}`} type="checkbox" class="size-4" bind:checked={draftPaid} />
          <label class="text-sm dark:text-zinc-300" for={`paid-${sale.id}`}>Pagado</label>
        </div>
      {/if}
      {#each draftItems as it, i (it.id)}
        <div
          class="flex flex-wrap items-end gap-2 rounded-md bg-zinc-50 p-2 sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] sm:bg-transparent sm:p-0 dark:bg-zinc-800/40"
        >
          <div class="min-w-[140px] flex-1">
            <input
              class="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              bind:value={draftItems[i].product}
              placeholder="Producto"
            />
          </div>
          <input
            class="w-20 rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            type="number"
            min="1"
            bind:value={draftItems[i].quantity}
          />
          <input
            class="w-28 rounded-lg border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            type="number"
            min="0"
            step="0.01"
            bind:value={draftItems[i].unitPrice}
          />
          <span class="ml-auto w-auto text-right text-xs text-zinc-600 sm:w-20 dark:text-zinc-400">
            {#if draftCurrency === 'USD'}
              {currency(Number(draftItems[i].quantity) * Number(draftItems[i].unitPrice))}
              {#if bolivarRate}
                <span class="ml-1 text-[10px] text-zinc-400"
                  >(Bs {(
                    Number(draftItems[i].quantity) *
                    Number(draftItems[i].unitPrice) *
                    bolivarRate
                  ).toFixed(2)})</span
                >
              {/if}
            {:else}
              Bs {(Number(draftItems[i].quantity) * Number(draftItems[i].unitPrice)).toFixed(2)}
              {#if bolivarRate}
                <span class="ml-1 text-[10px] text-zinc-400"
                  >($ {(
                    (Number(draftItems[i].quantity) * Number(draftItems[i].unitPrice)) /
                    bolivarRate
                  ).toFixed(2)})</span
                >
              {/if}
            {/if}
          </span>
          <button
            type="button"
            class="text-xs text-red-600 hover:underline disabled:opacity-40"
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
        <span class="text-xs text-zinc-600">
          Total:
          {#if draftCurrency === 'USD'}
            <strong>{currency(draftTotal)}</strong>
            {#if bolivarRate}
              <span class="ml-1 text-[10px] text-zinc-400"
                >(Bs {(draftTotal * bolivarRate).toFixed(2)})</span
              >
            {/if}
          {:else}
            <strong>Bs {draftTotal.toFixed(2)}</strong>
            {#if bolivarRate}
              <span class="ml-1 text-[10px] text-zinc-400"
                >($ {(draftTotal / bolivarRate).toFixed(2)})</span
              >
            {/if}
          {/if}
        </span>
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
    <div class="relative mt-3 text-sm">
      {#if editing && isDesktop}
        <div
          class="pointer-events-none absolute inset-0 rounded-lg bg-white/60 backdrop-blur-[2px] transition-opacity"
        ></div>
      {/if}
      <ul class="space-y-1">
        {#each sale.items.slice(0, 2) as it}
          <li class="flex flex-col">
            <div class="flex justify-between">
              <span class="text-zinc-700 dark:text-zinc-200">{it.product} × {it.quantity}</span>
              <span class="font-medium text-zinc-900 dark:text-zinc-100"
                >{currency(it.unitPrice * it.quantity)}</span
              >
            </div>
          </li>
        {/each}
      </ul>
      {#if sale.items.length > 2}
        <div class="mt-2">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-200"
            aria-label={`Ver todos los productos (${sale.items.length})`}
            onclick={() => (showingAllItems = true)}
          >
            Ver {sale.items.length - 2} más…
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <footer class="mt-auto space-y-4 pt-3">
    <div class="space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
      <div>
        Total: <span class="font-semibold text-zinc-900 dark:text-zinc-100"
          >{currency(sale.total)}</span
        >
        {#if sale.total && bolivarRate}
          <span class="ml-1 text-[10px] text-zinc-500 dark:text-zinc-500/70"
            >(Bs {(sale.total * bolivarRate).toFixed(2)})</span
          >
        {/if}
      </div>
      {#if sale.paid}
        <div>
          Pagado: <span class="font-medium dark:text-zinc-200">{currency(sale.paid)}</span>
          {#if bolivarRate}
            <span class="ml-1 text-[10px] text-zinc-500 dark:text-zinc-500/70"
              >(Bs {(sale.paid * bolivarRate).toFixed(2)})</span
            >
          {/if}
        </div>
      {/if}
      {#if remainingAmount(sale) > 0}
        <div>
          Resta: <span class="font-medium dark:text-zinc-200"
            >{currency(remainingAmount(sale))}</span
          >
          {#if bolivarRate}
            <span class="ml-1 text-[10px] text-zinc-500 dark:text-zinc-500/70"
              >(Bs {(remainingAmount(sale) * bolivarRate).toFixed(2)})</span
            >
          {/if}
        </div>
      {/if}
      {#if sale.status === 'pending'}
        • {daysSince(sale.createdAt)} días pendiente de pago
      {:else if sale.deliveredAt}
        • Pagado hace {daysSince(sale.deliveredAt)} días
      {/if}
    </div>

    {#if !editing}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {#if sale.status === 'pending'}
          <div class="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            {#if !addingPayment}
              <button
                type="button"
                class="inline-flex w-full min-w-[110px] items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-blue-500 active:scale-[.98] sm:w-auto"
                onclick={startAddPayment}>Abonar</button
              >
            {:else}
              <div class="flex w-full items-center gap-2 sm:w-auto">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  class="w-full max-w-[120px] rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                  placeholder="$"
                  bind:value={partialAmount}
                />
                <select
                  class="h-8 rounded-lg border border-zinc-300 bg-white px-1.5 text-[11px]"
                  bind:value={partialCurrency}
                >
                  <option value="USD">USD</option>
                  <option value="VES">Bs</option>
                </select>
                <button
                  type="button"
                  class="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-500"
                  onclick={confirmAddPayment}
                  disabled={!partialAmount ||
                    (partialCurrency === 'VES' && (!bolivarRate || bolivarRate <= 0))}>OK</button
                >
                <button
                  type="button"
                  class="h-8 rounded-lg bg-zinc-200 px-3 text-xs font-medium hover:bg-zinc-300"
                  onclick={cancelAddPayment}>✕</button
                >
              </div>
            {/if}
            <button
              type="button"
              class="inline-flex w-full min-w-[130px] items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500 active:scale-[.98] sm:w-auto"
              onclick={() => onMarkDelivered(sale.id)}>Marcar pagado</button
            >
          </div>
        {/if}

        {#if normalizedPhone && pendingAmount}
          <div class="flex justify-start sm:justify-end">
            <a
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 hover:bg-green-100"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              title="Enviar recordatorio por WhatsApp"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="23.82"
                height="24"
                viewBox="0 0 256 258"
              >
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
          </div>
        {/if}
      </div>
    {/if}
  </footer>
</article>

{#if editing && isDesktop}
  <!-- Dirty check -->
  {#key sale.id + String(editing)}
    {#snippet editModal({ close }: { close: () => void })}
      <header class="mb-4 flex items-center justify-between">
        <h2 id={`edit-title-${sale.id}`} class="text-base font-semibold">
          {mode === 'sales' ? 'Editar venta' : 'Editar deuda'}
        </h2>
        <button
          type="button"
          class="grid h-9 w-9 place-content-center rounded-lg hover:bg-zinc-100"
          aria-label="Cerrar"
          onclick={() => close()}>✕</button
        >
      </header>
      <div class="space-y-4 text-sm">
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for={`debtor-${sale.id}`}>Cliente</label>
          <input
            id={`debtor-${sale.id}`}
            class="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            bind:value={draftDebtorName}
          />
        </div>
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for={`debtor-phone-${sale.id}`}>Teléfono</label>
          <input
            id={`debtor-phone-${sale.id}`}
            class="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Opcional"
            bind:value={draftDebtorPhone}
          />
        </div>
        {#if sale.status !== 'pending'}
          <div class="flex items-center gap-2 pt-1">
            <input id={`paid-${sale.id}`} type="checkbox" class="size-4" bind:checked={draftPaid} />
            <label class="text-sm" for={`paid-${sale.id}`}>Pagado</label>
          </div>
        {/if}
        <div class="space-y-3">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <p class="text-xs text-zinc-600">Items</p>
            <div class="grid gap-1">
              <label
                class="text-[10px] font-medium tracking-wide text-zinc-500 uppercase"
                for={`currency-modal-${sale.id}`}>Moneda</label
              >
              <select
                id={`currency-modal-${sale.id}`}
                class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs"
                bind:value={draftCurrency}
              >
                <option value="USD">Dólar ($)</option>
                <option value="VES">Bolívares (Bs)</option>
              </select>
            </div>
          </div>
          {#each draftItems as it, i (it.id)}
            <div
              class="grid gap-2 rounded-lg bg-zinc-50 p-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:bg-transparent md:p-0"
            >
              <div class="min-w-[160px]">
                <input
                  class="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  bind:value={draftItems[i].product}
                  placeholder="Producto"
                />
              </div>
              <input
                class="w-24 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                type="number"
                min="1"
                bind:value={draftItems[i].quantity}
              />
              <input
                class="w-28 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                type="number"
                min="0"
                step="0.01"
                bind:value={draftItems[i].unitPrice}
              />
              <span class="w-auto text-right text-xs text-zinc-600 md:w-24 md:self-center">
                {#if draftCurrency === 'USD'}
                  {currency(Number(draftItems[i].quantity) * Number(draftItems[i].unitPrice))}
                  {#if bolivarRate}
                    <span class="ml-1 text-[10px] text-zinc-400"
                      >(Bs {(
                        Number(draftItems[i].quantity) *
                        Number(draftItems[i].unitPrice) *
                        bolivarRate
                      ).toFixed(2)})</span
                    >
                  {/if}
                {:else}
                  Bs {(Number(draftItems[i].quantity) * Number(draftItems[i].unitPrice)).toFixed(2)}
                  {#if bolivarRate}
                    <span class="ml-1 text-[10px] text-zinc-400"
                      >($ {(
                        (Number(draftItems[i].quantity) * Number(draftItems[i].unitPrice)) /
                        bolivarRate
                      ).toFixed(2)})</span
                    >
                  {/if}
                {/if}
              </span>
              <button
                type="button"
                class="text-xs text-red-600 hover:underline disabled:opacity-40"
                aria-label="Eliminar"
                onclick={() => removeDraftItem(it.id)}
                disabled={draftItems.length === 1}>✕</button
              >
            </div>
          {/each}
          <div class="flex items-center justify-between pt-2">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-300"
              onclick={addDraftItem}>Añadir producto</button
            >
            <span class="text-xs text-zinc-600">
              Total:
              {#if draftCurrency === 'USD'}
                <strong>{currency(draftTotal)}</strong>
                {#if bolivarRate}
                  <span class="ml-1 text-[10px] text-zinc-400"
                    >(Bs {(draftTotal * bolivarRate).toFixed(2)})</span
                  >
                {/if}
              {:else}
                <strong>Bs {draftTotal.toFixed(2)}</strong>
                {#if bolivarRate}
                  <span class="ml-1 text-[10px] text-zinc-400"
                    >($ {(draftTotal / bolivarRate).toFixed(2)})</span
                  >
                {/if}
              {/if}
            </span>
          </div>
        </div>
        <div class="flex flex-wrap justify-end gap-3 pt-4">
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!isDirty}
            onclick={restoreDraft}>Restaurar</button
          >
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-300"
            onclick={close}>Cancelar</button
          >
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg bg-zinc-400 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            class:bg-zinc-900={isEditValid}
            disabled={!isEditValid}
            onclick={() => {
              if (!isEditValid) return;
              saveEdit();
              close();
            }}>Guardar</button
          >
        </div>
      </div>
    {/snippet}
    <ModalPortal
      labelledBy={`edit-title-${sale.id}`}
      beforeClose={() => {
        const dirty =
          draftDebtorName.trim() !== debtorName.trim() ||
          (debtorPhone ?? '') !== draftDebtorPhone.trim() ||
          draftPaid !== (sale.status === 'delivered') ||
          draftItems.some((it, idx) => {
            const orig = sale.items[idx];
            if (!orig) return true;
            return (
              it.product !== orig.product ||
              Number(it.quantity) !== orig.quantity ||
              Number(it.unitPrice) !== orig.unitPrice
            );
          }) ||
          sale.items.length !== draftItems.length;
        if (dirty && !confirm('Hay cambios sin guardar. ¿Cerrar de todos modos?')) return false;
      }}
      onClose={cancelEdit}
      size="lg"
      children={editModal}
    />
  {/key}
{/if}

{#if showingAllItems}
  {#key sale.id + '-items-modal'}
    {#snippet itemsModal({ close }: { close: () => void })}
      <header class="mb-4 flex items-center justify-between">
        <h2 id={`items-title-${sale.id}`} class="text-base font-semibold">
          {mode === 'sales' ? 'Productos de la venta' : 'Productos de la deuda'}
        </h2>
        <button
          type="button"
          class="grid h-9 w-9 place-content-center rounded-lg hover:bg-zinc-100"
          aria-label="Cerrar"
          onclick={() => close()}>✕</button
        >
      </header>
      <div class="max-h-[60vh] space-y-2 overflow-auto pr-2 text-sm">
        <ul class="space-y-1">
          {#each sale.items as it}
            <li class="flex flex-col rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
              <div class="flex justify-between gap-3">
                <span class="text-zinc-700">{it.product} × {it.quantity}</span>
                <span class="font-medium">{currency(it.unitPrice * it.quantity)}</span>
              </div>
            </li>
          {/each}
        </ul>
      </div>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          onclick={() => close()}>Cerrar</button
        >
      </div>
    {/snippet}
    <ModalPortal
      labelledBy={`items-title-${sale.id}`}
      beforeClose={() => {}}
      onClose={() => (showingAllItems = false)}
      size="md"
      children={itemsModal}
    />
  {/key}
{/if}
