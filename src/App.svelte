<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import { APP_VERSION } from '$lib/core/version';
  import NewSaleSheet from '$lib/components/NewSaleSheet.svelte';
  import NewSaleModal from '$lib/components/NewSaleModal.svelte';
  import SaleCard from '$lib/components/SaleCard.svelte';
  import type { AppState, NewSaleForm, Sale } from '$lib/core/types';
  import {
    addSale,
    currency,
    loadState,
    markDelivered,
    saveState,
    searchDebtors,
    upsertDebtor,
    updateSale,
    setSalePaid,
    topProducts,
    updateDebtorName,
    fetchBolivarRate,
    addPartialPayment,
  } from '$lib/core/utils';
  import { exportPendingToPDF } from '$lib/core/export';

  let status = $state(loadState() as AppState);
  let query = $state('');
  let openSheet = $state(false);
  let statusFilter = $state<'all' | 'pending' | 'delivered'>('all');
  let dateFrom = $state(''); // YYYY-MM-DD
  let dateTo = $state('');
  let showFilters = $state(false);
  // For suggestions while sheet open, track a transient debtor name typed in the sheet.
  // We'll pass suggestions from state; the sheet itself doesn't send intermediate events, so use recent debtor names.

  $effect(() => {
    saveState(status);
  });

  // Migración ligera: asignar currency 'USD' a ventas antiguas sin campo.
  $effect(() => {
    for (const s of status.sales) {
      if (!s.currency) s.currency = 'USD';
    }
  });

  $effect(() => {
    if (openSheet && typeof window !== 'undefined') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  });

  async function onExportPDF() {
    await exportPendingToPDF(status);
  }

  function onNewSale(form: NewSaleForm) {
    const debtor = upsertDebtor(status, form.debtorName, form.phone, form.notes);
    const isVES = form.currency === 'VES';
    const rate = bolivarRate || null; // bolívares por USD
    const items = form.items.map((it) => {
      const original = Number(it.unitPrice);
      const converted = isVES && rate && rate > 0 ? original / rate : original;
      return {
        product: it.product.trim(),
        quantity: Number(it.quantity),
        unitPrice: converted, // almacenado siempre en USD
        unitPriceVES: isVES ? original : undefined,
      };
    });
    addSale(status, debtor, items, form.delivered, form.currency || 'USD');
    openSheet = false;
  }

  function onMarkDelivered(id: string) {
    markDelivered(status, id);
  }

  function onPartialPayment(saleId: string, amount: number) {
    addPartialPayment(status, saleId, amount);
  }

  function onEditSale(
    saleId: string,
    payload: {
      items: {
        id: string;
        product: string;
        quantity: number;
        unitPrice: number;
      }[];
      paid: boolean;
      debtorName?: string;
      debtorPhone?: string;
    },
  ) {
    updateSale(status, saleId, payload.items);
    setSalePaid(status, saleId, payload.paid);
    if (payload.debtorName !== undefined) {
      const sale = status.sales.find((s) => s.id === saleId);
      if (sale) updateDebtorName(status, sale.debtorId, payload.debtorName);
    }
    if (payload.debtorPhone !== undefined) {
      const sale = status.sales.find((s) => s.id === saleId);
      if (sale) {
        const debtor = status.debtors.find((d) => d.id === sale.debtorId);
        if (debtor) debtor.phone = payload.debtorPhone.trim() || undefined;
      }
    }
  }

  const filteredDebtors = $derived(searchDebtors(status, query));
  function matchesFilters(s: Sale) {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    const created = new Date(s.createdAt).getTime();
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`).getTime();
      if (created < from) return false;
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`).getTime();
      if (created > to) return false;
    }
    return true;
  }
  const salesByDebtor = (debtorId: string) =>
    status.sales.filter((s) => s.debtorId === debtorId && matchesFilters(s));
  const filteredDebtorsWithSales = $derived(
    filteredDebtors.filter((d) => salesByDebtor(d.id).length > 0),
  );
  const filteredSumForDebtor = (debtorId: string) =>
    salesByDebtor(debtorId).reduce((sum, s) => sum + s.total, 0);
  const summaryLabel = $derived(
    statusFilter === 'delivered' ? 'Pagado' : statusFilter === 'pending' ? 'Pendiente' : 'Total',
  );

  // Header summary adapts to search + date filters. For 'Todos', it shows Pendiente.
  const headerSum = $derived(
    (() => {
      const ids = new Set(filteredDebtors.map((d) => d.id));
      const inDate = (s: Sale) => {
        const created = new Date(s.createdAt).getTime();
        if (dateFrom) {
          const from = new Date(`${dateFrom}T00:00:00`).getTime();
          if (created < from) return false;
        }
        if (dateTo) {
          const to = new Date(`${dateTo}T23:59:59.999`).getTime();
          if (created > to) return false;
        }
        return true;
      };
      const matchStatusForHeader = (s: Sale) =>
        statusFilter === 'all' ? s.status !== 'delivered' : s.status === statusFilter;
      return status.sales
        .filter((s) => ids.has(s.debtorId))
        .filter(inDate)
        .filter(matchStatusForHeader)
        .reduce((sum, s) => sum + s.total, 0);
    })(),
  );

  const headerLabel = $derived(statusFilter === 'delivered' ? 'Pagado' : 'Pendiente');

  // Total sales count (all sales, regardless of filters) and filtered count if needed later
  const totalSalesCount = $derived(status.sales.length);

  // --- Desktop extra stats ---
  const totalPendingUSD = $derived(
    status.sales.filter((s) => s.status === 'pending').reduce((sum, s) => sum + s.total, 0),
  );
  const totalDeliveredUSD = $derived(
    status.sales.filter((s) => s.status === 'delivered').reduce((sum, s) => sum + s.total, 0),
  );
  const pendingSalesCount = $derived(status.sales.filter((s) => s.status === 'pending').length);
  const deliveredSalesCount = $derived(status.sales.filter((s) => s.status === 'delivered').length);

  let isDesktop = $state(false);
  // Desktop ahora sólo si ancho >= 1140px para no activar en tablets grandes u horizontales
  $effect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 1140px)');
    const update = () => (isDesktop = mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  });

  $inspect(isDesktop);

  // Keyboard shortcuts
  $effect(() => {
    if (typeof window === 'undefined') return;
    function onKey(e: KeyboardEvent) {
      if (!isDesktop) return;
      // Trigger new sale with either left or right Shift + N (no Ctrl)
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openSheet = true;
      }
      if (e.key === '/' && (document.activeElement?.tagName || '') !== 'INPUT') {
        e.preventDefault();
        const input = document.getElementById('global-search') as HTMLInputElement | null;
        input?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Suggestions
  const commonProducts = $derived(topProducts(status, 6));
  const debtorNameSuggestions = $derived(status.debtors.map((d) => d.name));

  // Exchange rate state
  let bolivarRate = $state<number | null>(null);
  let bolivarRateUpdatedAt = $state<string | null>(null);
  let loadingRate = $state(false);
  let rateError = $state<string | null>(null);

  async function loadBolivarRate() {
    loadingRate = true;
    rateError = null;
    const r = await fetchBolivarRate();
    if (r) {
      bolivarRate = r.value;
      bolivarRateUpdatedAt = r.updatedAt;
    } else rateError = 'No se pudo cargar tasa';
    loadingRate = false;
  }

  // Load on mount (run once)
  let rateLoaded = false;
  let rateInterval: number | null = null;
  $effect(() => {
    if (!rateLoaded) {
      rateLoaded = true;
      loadBolivarRate();
      rateInterval = window.setInterval(
        () => {
          loadBolivarRate();
        },
        1000 * 60 * 60 * 4,
      ); // 4 horas
    }
    return () => {
      if (rateInterval) clearInterval(rateInterval);
    };
  });
</script>

<div class="min-h-dvh bg-zinc-50 text-zinc-900">
  <Header
    totalPending={currency(headerSum)}
    totalPendingRaw={headerSum}
    totalLabel={headerLabel}
    totalSales={totalSalesCount}
    onAdd={() => (openSheet = true)}
    onExport={onExportPDF}
    {isDesktop}
    {bolivarRate}
    {bolivarRateUpdatedAt}
  />

  <div class="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 pt-2 text-xs text-zinc-600">
    {#if loadingRate}
      <div class="flex items-center gap-2">
        <span>Cargando tasa</span>
        <span class="inline-block animate-spin">⏳</span>
      </div>
    {:else if bolivarRate}
      <span class="text-base font-semibold">
        Tasa oficial: 1 $ = {bolivarRate.toFixed(2)} Bs
        {#if bolivarRateUpdatedAt}
          <span class="ml-2 text-[10px] text-zinc-400"
            >({new Date(bolivarRateUpdatedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })})</span
          >
        {/if}
      </span>
    {:else}
      <span>{rateError}</span>
      <button type="button" class="underline" onclick={loadBolivarRate}>Reintentar</button>
    {/if}
  </div>

  <main class="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pt-4 pb-24 lg:pb-12">
    <div class="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside class="space-y-6 lg:sticky lg:top-[64px] lg:self-start">
        <div class="relative">
          <input
            id="global-search"
            class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-10 text-sm ring-zinc-300 outline-none focus:ring-2"
            placeholder="Buscar cliente (/)..."
            bind:value={query}
          />
          <span class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400"
            >🔎</span
          >
        </div>
        <section class="grid gap-3">
          <div class="lg:hidden">
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-100 active:scale-[.98]"
              aria-expanded={showFilters}
              aria-controls="filters-panel"
              onclick={() => (showFilters = !showFilters)}
            >
              Filtros
              <span class="text-xs">{showFilters ? '▲' : '▼'}</span>
            </button>
          </div>
          {#if showFilters || isDesktop}
            <div
              id="filters-panel"
              class="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 lg:p-5"
            >
              <div
                class="grid [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))] gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]"
              >
                <div class="grid min-w-[140px] gap-1">
                  <label class="text-xs font-medium text-zinc-600" for="filter-status">Estado</label
                  >
                  <select
                    id="filter-status"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                    bind:value={statusFilter}
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendiente</option>
                    <option value="delivered">Pagado</option>
                  </select>
                </div>
                <div class="grid min-w-[140px] gap-1">
                  <label class="text-xs font-medium text-zinc-600" for="filter-from">Desde</label>
                  <input
                    id="filter-from"
                    type="date"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-4 text-sm"
                    bind:value={dateFrom}
                  />
                </div>
                <div class="grid min-w-[140px] gap-1">
                  <label class="text-xs font-medium text-zinc-600" for="filter-to">Hasta</label>
                  <input
                    id="filter-to"
                    type="date"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-4 text-sm"
                    bind:value={dateTo}
                  />
                </div>
              </div>
              <div class="flex flex-wrap justify-end gap-3 pt-1">
                <button
                  type="button"
                  class="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-800"
                  onclick={() => {
                    statusFilter = 'all';
                    dateFrom = '';
                    dateTo = '';
                  }}>Limpiar</button
                >
                {#if !isDesktop}
                  <button
                    type="button"
                    class="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-800"
                    onclick={() => (showFilters = false)}>Cerrar</button
                  >
                {/if}
              </div>
            </div>
          {/if}
        </section>
        {#if isDesktop}
          <section class="grid gap-4">
            <div class="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-xs">
              <h3 class="text-sm font-semibold">Resumen</h3>
              <ul class="space-y-1">
                <li class="flex justify-between">
                  <span class="text-zinc-500">Pendiente</span><span class="font-medium"
                    >{currency(totalPendingUSD)}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-zinc-500">Pagado</span><span class="font-medium"
                    >{currency(totalDeliveredUSD)}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-zinc-500">Ventas pendientes</span><span class="font-medium"
                    >{pendingSalesCount}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-zinc-500">Ventas pagadas</span><span class="font-medium"
                    >{deliveredSalesCount}</span
                  >
                </li>
              </ul>
              {#if bolivarRate}
                <p class="pt-1 text-[10px] text-zinc-500">
                  ≈ Bs {(totalPendingUSD * bolivarRate).toFixed(2)} pendientes
                </p>
              {/if}
            </div>
            <div class="rounded-xl border border-dashed border-zinc-300 p-4 text-xs text-zinc-500">
              <p class="mb-2 font-medium text-zinc-700">Atajos</p>
              <ul class="space-y-1">
                <li>
                  <kbd class="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px]">Shift</kbd> +
                  <kbd class="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px]">N</kbd> Nueva venta
                </li>
                <li><kbd class="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px]">/</kbd> Buscar</li>
              </ul>
            </div>
          </section>
        {/if}
      </aside>
      <div class="space-y-6">
        {#if status.debtors.length === 0}
          <section
            class="rounded-xl border border-zinc-200 bg-white/70 p-10 text-center text-zinc-600"
          >
            <p class="text-sm">Aún no hay ventas registradas.</p>
            <button
              class="mt-4 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              onclick={() => (openSheet = true)}>Agregar primera venta</button
            >
            {#if isDesktop}
              <div class="mt-6 grid gap-4 text-left md:grid-cols-2">
                <div>
                  <h4 class="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Tips
                  </h4>
                  <ul class="list-inside list-disc space-y-1 text-xs text-zinc-500">
                    <li>Usa Shift + N para abrir rápidamente el formulario.</li>
                    <li>Presiona / y empieza a escribir para buscar un cliente.</li>
                  </ul>
                </div>
                <div>
                  <h4 class="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                    Próximamente
                  </h4>
                  <ul class="list-inside list-disc space-y-1 text-xs text-zinc-500">
                    <li>Exportar a Excel.</li>
                    <li>Gráficas mensuales.</li>
                  </ul>
                </div>
              </div>
            {/if}
          </section>
        {/if}
        {#if filteredDebtorsWithSales.length > 0}
          <section class="space-y-8">
            {#each filteredDebtorsWithSales as debtor}
              <div class="space-y-3">
                <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <h2 class="text-base font-semibold">{debtor.name}</h2>
                  <div class="text-right leading-tight">
                    <div class="text-sm text-zinc-600">
                      {summaryLabel}:
                      <span class="font-medium">{currency(filteredSumForDebtor(debtor.id))}</span>
                    </div>
                    {#if bolivarRate}
                      <div class="text-[10px] text-zinc-500">
                        ≈ Bs {(filteredSumForDebtor(debtor.id) * bolivarRate).toFixed(2)}
                      </div>
                    {/if}
                  </div>
                </div>
                {#key salesByDebtor(debtor.id).length}
                  <div
                    class={`anim-stagger ${
                      salesByDebtor(debtor.id).length <= 2
                        ? 'flex flex-col gap-4 md:flex-row md:items-stretch'
                        : 'grid [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))] gap-4'
                    }`}
                  >
                    {#each salesByDebtor(debtor.id) as sale (sale.id)}
                      <div class="anim-fade-in min-w-[320px] flex-1">
                        <SaleCard
                          {sale}
                          debtorName={debtor.name}
                          debtorPhone={debtor.phone}
                          {onMarkDelivered}
                          onEdit={onEditSale}
                          {bolivarRate}
                          {onPartialPayment}
                        />
                      </div>
                    {/each}
                  </div>
                {/key}
              </div>
            {/each}
          </section>
        {/if}
      </div>
    </div>
  </main>
  {#if isDesktop}
    <NewSaleModal
      open={openSheet}
      onsubmit={onNewSale}
      oncancel={() => (openSheet = false)}
      debtorSuggestions={debtorNameSuggestions}
      productSuggestions={commonProducts}
      {bolivarRate}
    />
  {:else}
    <NewSaleSheet
      open={openSheet}
      onsubmit={onNewSale}
      oncancel={() => (openSheet = false)}
      debtorSuggestions={debtorNameSuggestions}
      productSuggestions={commonProducts}
      {bolivarRate}
    />
  {/if}
  <!-- Créditos / autor: colocado fijo y discreto -->
  <div
    class="fixed right-3 bottom-[34px] z-30 text-[10px] text-zinc-500 opacity-70 select-none print:hidden"
  >
    v{APP_VERSION}
  </div>
  <div class="fixed right-3 bottom-2 z-30 select-none print:hidden">
    <a
      href="https://erickgiber.vercel.app"
      target="_blank"
      rel="noopener noreferrer"
      class="group inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium text-zinc-500 shadow ring-1 ring-zinc-200 backdrop-blur transition hover:bg-white hover:text-zinc-700"
    >
      <span class="opacity-80 group-hover:opacity-100">Creado por:</span>
      <span class="text-zinc-700 group-hover:text-zinc-900">Erick Ramírez</span>
    </a>
  </div>
</div>
