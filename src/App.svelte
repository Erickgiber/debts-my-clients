<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import NewSaleSheet from '$lib/components/NewSaleSheet.svelte';
  import SaleCard from '$lib/components/SaleCard.svelte';
  import type { AppState, NewSaleForm, Sale } from '$lib/core/types';
  import {
    addSale,
    currency,
    loadState,
    markDelivered,
    saveState,
    searchDebtors,
    sumDebtsForDebtor,
    upsertDebtor,
    updateSale,
    setSalePaid,
    topProducts,
    topProductsForDebtorName,
    updateDebtorName,
  } from '$lib/core/utils';
  import { exportPendingToPDF } from '$lib/core/export';

  let status = $state(loadState() as AppState);
  let query = $state('');
  let openSheet = $state(false);
  let statusFilter = $state<'all' | 'pending' | 'delivered'>('all');
  let dateFrom = $state(''); // YYYY-MM-DD
  let dateTo = $state('');
  // For suggestions while sheet open, track a transient debtor name typed in the sheet.
  // We'll pass suggestions from state; the sheet itself doesn't send intermediate events, so use recent debtor names.

  $effect(() => {
    saveState(status);
  });
  function onExportPDF() {
    exportPendingToPDF(status);
  }

  const totalPendingAmount = $derived(
    status.sales.filter((s) => s.status !== 'delivered').reduce((sum, s) => sum + s.total, 0),
  );

  function onNewSale(form: NewSaleForm) {
    const debtor = upsertDebtor(status, form.debtorName, form.phone, form.notes);
    addSale(
      status,
      debtor,
      [
        {
          product: form.product.trim(),
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
        },
      ],
      form.delivered,
    );
    openSheet = false;
  }

  function onMarkDelivered(id: string) {
    markDelivered(status, id);
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
    },
  ) {
    updateSale(status, saleId, payload.items);
    setSalePaid(status, saleId, payload.paid);
    if (payload.debtorName !== undefined) {
      const sale = status.sales.find((s) => s.id === saleId);
      if (sale) updateDebtorName(status, sale.debtorId, payload.debtorName);
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

  // Suggestions
  const commonProducts = $derived(topProducts(status, 6));
  const debtorNameSuggestions = $derived(status.debtors.map((d) => d.name));
</script>

<div class="min-h-dvh bg-zinc-50 text-zinc-900">
  <Header
    totalPending={currency(headerSum)}
    totalLabel={headerLabel}
    onAdd={() => (openSheet = true)}
    onExport={onExportPDF}
  />

  <main class="mx-auto max-w-lg space-y-6 px-4 pt-4 pb-24">
    <div class="relative">
      <input
        class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-10 text-sm ring-zinc-300 outline-none focus:ring-2"
        placeholder="Buscar cliente..."
        bind:value={query}
      />
      <span class="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400">🔎</span>
    </div>

    <section class="grid gap-3">
      <div class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-3">
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="filter-status">Estado</label>
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
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="filter-from">Desde</label>
          <input
            id="filter-from"
            type="date"
            class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            bind:value={dateFrom}
          />
        </div>
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="filter-to">Hasta</label>
          <input
            id="filter-to"
            type="date"
            class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            bind:value={dateTo}
          />
        </div>
      </div>
      <div class="flex justify-end">
        <button
          type="button"
          class="text-xs text-zinc-700 hover:underline"
          onclick={() => {
            statusFilter = 'all';
            dateFrom = '';
            dateTo = '';
          }}>Limpiar filtros</button
        >
      </div>
    </section>

    {#if status.debtors.length === 0}
      <section class="py-16 text-center text-zinc-600">
        <p class="text-sm">Aún no hay ventas registradas.</p>
        <button
          class="mt-4 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          onclick={() => (openSheet = true)}>Agregar primera venta</button
        >
      </section>
    {/if}

    {#if filteredDebtorsWithSales.length > 0}
      <section class="space-y-8">
        {#each filteredDebtorsWithSales as debtor}
          <div class="space-y-3">
            <div class="flex items-end justify-between">
              <h2 class="text-base font-semibold">{debtor.name}</h2>
              <span class="text-sm text-zinc-600"
                >{summaryLabel}:
                <span class="font-medium">{currency(filteredSumForDebtor(debtor.id))}</span></span
              >
            </div>
            <div class="grid gap-3">
              {#each salesByDebtor(debtor.id) as sale (sale.id)}
                <SaleCard {sale} debtorName={debtor.name} {onMarkDelivered} onEdit={onEditSale} />
              {/each}
            </div>
          </div>
        {/each}
      </section>
    {/if}
  </main>
  <NewSaleSheet
    open={openSheet}
    onsubmit={onNewSale}
    oncancel={() => (openSheet = false)}
    debtorSuggestions={debtorNameSuggestions}
    productSuggestions={commonProducts}
  />
</div>
