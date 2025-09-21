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
  import { appMode, type AppMode } from '$lib/core/mode';
  import { theme } from '$lib/core/theme';

  let mode = $state<AppMode>('sales');
  $effect.pre(() => {
    const unsub = appMode.subscribe((m) => (mode = m));
    return () => unsub();
  });

  // Estado principal separado por modo; inicializamos perezoso.
  let status = $state<AppState>({ debtors: [], sales: [] });
  let loadedMode: AppMode | null = null;

  function ensureStateFor(current: AppMode) {
    if (loadedMode !== current) {
      status = loadState(current);
      loadedMode = current;
    }
  }

  // Cargar al inicio y cuando cambie el modo
  $effect(() => {
    ensureStateFor(mode);
  });
  let query = $state('');
  let openSheet = $state(false);
  let statusFilter = $state<'all' | 'pending' | 'delivered'>('all');
  let dateFrom = $state(''); // YYYY-MM-DD
  let dateTo = $state('');
  let showFilters = $state(false);
  // For suggestions while sheet open, track a transient debtor name typed in the sheet.
  // We'll pass suggestions from state; the sheet itself doesn't send intermediate events, so use recent debtor names.

  // Guardar siempre que cambie status (y tengamos modo cargado)
  $effect(() => {
    if (loadedMode) saveState(status, loadedMode);
  });
  // Al cambiar modo: cerrar formularios abiertos para evitar mezclar UI
  $effect(() => {
    // Este efecto depende de mode implícitamente
    openSheet = false;
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
    await exportPendingToPDF(status); // Mantiene misma lógica para ambos modos
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
      currency?: 'USD' | 'VES';
    },
  ) {
    const sale = status.sales.find((s) => s.id === saleId);
    const targetCurrency = payload.currency || sale?.currency || 'USD';
    const rate = bolivarRate || null;
    // Convert incoming unitPrice si la moneda objetivo es USD pero el draft venía en VES (draftCurrency manejado en SaleCard ya convirtió precios visualmente). Aquí asumimos que los unitPrice están en la moneda mostrada.
    let adjustedItems = payload.items.map((it) => ({ ...it }));
    if (targetCurrency === 'VES') {
      // Guardamos unitPrice en USD internamente => convertir VES -> USD si tenemos tasa
      if (rate && rate > 0) {
        adjustedItems = adjustedItems.map((it) => ({
          ...it,
          unitPriceVES: it.unitPrice,
          unitPrice: it.unitPrice / rate,
        }));
      } else {
        // Sin tasa no convertimos (se queda igual en USD interpretado) -> Podríamos alertar
      }
    } else {
      // Currency USD => limpiar unitPriceVES
      adjustedItems = adjustedItems.map((it) => ({ ...it, unitPriceVES: undefined }));
    }
    if (sale) sale.currency = targetCurrency;
    updateSale(status, saleId, adjustedItems as any);
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
  // Debug: estado de tema actual (remover cuando ya no se necesite)
  let currentTheme = $state<'light' | 'dark'>('light');
  $effect.pre(() => {
    const unsubTheme = theme.subscribe((t) => (currentTheme = t));
    return () => unsubTheme();
  });
  // Desktop ahora sólo si ancho >= 1140px para no activar en tablets grandes u horizontales
  $effect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 1140px)');
    const update = () => (isDesktop = mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  });

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

  async function loadBolivarRate(force = false) {
    loadingRate = true;
    rateError = null;
    const r = await fetchBolivarRate({ force });
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
      // Forzar la primera carga al abrir la app
      loadBolivarRate(true);
      // Actualizar automáticamente cada 1 hora
      rateInterval = window.setInterval(
        () => {
          loadBolivarRate();
        },
        1000 * 60 * 60,
      );
      // Refrescar cuando la pestaña/app vuelva a estar visible
      const onVis = () => {
        if (document.visibilityState === 'visible') loadBolivarRate();
      };
      document.addEventListener('visibilitychange', onVis);
      return () => {
        if (rateInterval) clearInterval(rateInterval);
        document.removeEventListener('visibilitychange', onVis);
      };
    }
  });
</script>

<div
  class="min-h-dvh bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100"
>
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
    {mode}
  />

  <div
    class="mx-auto flex w-full max-w-7xl items-center gap-2 px-4 pt-2 text-xs text-zinc-600 dark:text-zinc-400"
  >
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
      <button type="button" class="underline" onclick={() => loadBolivarRate()}>Reintentar</button>
    {/if}
  </div>

  <main class="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pt-4 pb-24 lg:pb-12">
    <div class="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside class="space-y-6 lg:sticky lg:top-[64px] lg:self-start">
        <div class="relative">
          <input
            id="global-search"
            class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-10 text-sm ring-zinc-300 outline-none focus:ring-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
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
              class="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-100 active:scale-[.98] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/80"
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
              class="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 lg:p-5 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <div
                class="grid [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))] gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]"
              >
                <div class="grid min-w-[140px] gap-1">
                  <label
                    class="text-xs font-medium text-zinc-600 dark:text-zinc-300"
                    for="filter-status">Estado</label
                  >
                  <select
                    id="filter-status"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    bind:value={statusFilter}
                  >
                    <option value="all">Todos</option>
                    <option value="pending">Pendiente</option>
                    <option value="delivered">Pagado</option>
                  </select>
                </div>
                <div class="grid min-w-[140px] gap-1">
                  <label
                    class="text-xs font-medium text-zinc-600 dark:text-zinc-300"
                    for="filter-from">Desde</label
                  >
                  <input
                    id="filter-from"
                    type="date"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-4 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    bind:value={dateFrom}
                  />
                </div>
                <div class="grid min-w-[140px] gap-1">
                  <label
                    class="text-xs font-medium text-zinc-600 dark:text-zinc-300"
                    for="filter-to">Hasta</label
                  >
                  <input
                    id="filter-to"
                    type="date"
                    class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-4 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    bind:value={dateTo}
                  />
                </div>
              </div>
              <div class="flex flex-wrap justify-end gap-3 pt-1">
                <button
                  type="button"
                  class="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                  onclick={() => {
                    statusFilter = 'all';
                    dateFrom = '';
                    dateTo = '';
                  }}>Limpiar</button
                >
                {#if !isDesktop}
                  <button
                    type="button"
                    class="text-xs text-zinc-600 underline underline-offset-2 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    onclick={() => (showFilters = false)}>Cerrar</button
                  >
                {/if}
              </div>
            </div>
          {/if}
        </section>
        {#if isDesktop}
          <section class="grid gap-4">
            <div
              class="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-700 dark:bg-zinc-800"
            >
              <h3 class="text-sm font-semibold">Resumen</h3>
              <ul class="space-y-1">
                <li class="flex justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Pendiente</span><span
                    class="font-medium dark:text-zinc-100">{currency(totalPendingUSD)}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Pagado</span><span
                    class="font-medium dark:text-zinc-100">{currency(totalDeliveredUSD)}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Ventas pendientes</span><span
                    class="font-medium dark:text-zinc-100">{pendingSalesCount}</span
                  >
                </li>
                <li class="flex justify-between">
                  <span class="text-zinc-500 dark:text-zinc-400">Ventas pagadas</span><span
                    class="font-medium dark:text-zinc-100">{deliveredSalesCount}</span
                  >
                </li>
              </ul>
              {#if bolivarRate}
                <p class="pt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                  ≈ Bs {(totalPendingUSD * bolivarRate).toFixed(2)} pendientes
                </p>
              {/if}
            </div>
            <div
              class="rounded-xl border border-dashed border-zinc-300 p-4 text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-400"
            >
              <p class="mb-2 font-medium text-zinc-700 dark:text-zinc-300">Atajos</p>
              <ul class="space-y-1">
                <li>
                  <kbd
                    class="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] dark:bg-zinc-700 dark:text-zinc-100"
                    >Shift</kbd
                  >
                  +
                  <kbd
                    class="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] dark:bg-zinc-700 dark:text-zinc-100"
                    >N</kbd
                  > Nueva venta
                </li>
                <li>
                  <kbd
                    class="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] dark:bg-zinc-700 dark:text-zinc-100"
                    >/</kbd
                  > Buscar
                </li>
              </ul>
            </div>
          </section>
        {/if}
      </aside>
      <div class="space-y-6">
        {#if status.debtors.length === 0}
          <section
            class="rounded-xl border border-zinc-200 bg-white/70 p-10 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400"
          >
            <p class="text-sm">
              {mode === 'sales'
                ? 'Aún no hay ventas registradas.'
                : 'Aún no hay deudas registradas.'}
            </p>
            <button
              class="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 active:scale-[.98] dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
              onclick={() => (openSheet = true)}
              >{mode === 'sales' ? 'Agregar primera venta' : 'Registrar primera deuda'}</button
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
                    class={`${
                      salesByDebtor(debtor.id).length <= 2
                        ? 'flex flex-col gap-4 md:flex-row md:items-stretch'
                        : 'grid [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))] gap-4'
                    }`}
                  >
                    {#each salesByDebtor(debtor.id) as sale (sale.id)}
                      <div class="min-w-[320px] flex-1">
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
      class="group inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[11px] font-medium text-zinc-500 shadow ring-1 ring-zinc-200 backdrop-blur transition hover:bg-white hover:text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-400 dark:ring-zinc-700 dark:hover:bg-zinc-800/80"
    >
      <span
        class="opacity-80 group-hover:opacity-100 dark:text-zinc-400 dark:group-hover:text-zinc-200"
        >Creado por:</span
      >
      <span
        class="text-zinc-700 group-hover:text-zinc-900 dark:text-zinc-100 dark:group-hover:text-white"
        >Erick Ramírez</span
      >
    </a>
  </div>
</div>
