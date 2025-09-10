<script lang="ts">
  import Header from '$lib/components/Header.svelte'
  import NewSaleSheet from '$lib/components/NewSaleSheet.svelte'
  import SaleCard from '$lib/components/SaleCard.svelte'
  import type { AppState, NewSaleForm } from '$lib/core/types'
  import { addSale, currency, loadState, markDelivered, saveState, searchDebtors, sumDebtsForDebtor, upsertDebtor } from '$lib/core/utils'

  let status = $state(loadState() as AppState)
  let query = $state('')
  let openSheet = $state(false)

  $effect(() => {
    saveState(status)
  })

  const totalPendingAmount = $derived(
    status.sales.filter((s) => s.status !== 'delivered').reduce((sum, s) => sum + s.total, 0)
  )

  function onNewSale(form: NewSaleForm) {
    const debtor = upsertDebtor(status, form.debtorName, form.phone, form.notes)
    addSale(
      status,
      debtor,
      [{ product: form.product.trim(), quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }],
      form.delivered,
    )
    openSheet = false
  }

  function onMarkDelivered(id: string) {
    markDelivered(status, id)
  }

  const filteredDebtors = $derived(searchDebtors(status, query))
  const salesByDebtor = (debtorId: string) => status.sales.filter((s) => s.debtorId === debtorId)
</script>

<div class="min-h-dvh bg-zinc-50 text-zinc-900">
  <Header totalPending={currency(totalPendingAmount)} onAdd={() => (openSheet = true)} />

  <main class="mx-auto max-w-md px-4 pb-24 pt-4 space-y-6">
    <div class="relative">
      <input
        class="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-10 text-sm outline-none focus:ring-2 ring-zinc-300"
        placeholder="Buscar cliente..."
        bind:value={query}
      />
      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">🔎</span>
    </div>

    {#if status.debtors.length === 0}
      <section class="text-center py-16 text-zinc-600">
        <p class="text-sm">Aún no hay ventas registradas.</p>
  <button class="mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800" onclick={() => (openSheet = true)}>Agregar primera venta</button>
      </section>
    {/if}

    {#if filteredDebtors.length > 0}
      <section class="space-y-8">
        {#each filteredDebtors as debtor}
          <div class="space-y-3">
            <div class="flex items-end justify-between">
              <h2 class="text-base font-semibold">{debtor.name}</h2>
              <span class="text-sm text-zinc-600">Pendiente: <span class="font-medium">{currency(sumDebtsForDebtor(status, debtor.id))}</span></span>
            </div>
            <div class="grid gap-3">
              {#each salesByDebtor(debtor.id) as sale (sale.id)}
                <SaleCard sale={sale} debtorName={debtor.name} onMarkDelivered={onMarkDelivered} />
              {/each}
            </div>
          </div>
        {/each}
      </section>
    {/if}
  </main>
  <NewSaleSheet open={openSheet} onsubmit={onNewSale} oncancel={() => (openSheet = false)} />
</div>