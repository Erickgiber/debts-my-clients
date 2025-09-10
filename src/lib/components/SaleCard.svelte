<script lang="ts">
  import type { Sale } from '$lib/core/types'
  import { currency, daysSince } from '$lib/core/utils'

  let { sale, debtorName, onMarkDelivered }: { sale: Sale; debtorName: string; onMarkDelivered: (id: string) => void } = $props()
</script>

<article class="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
  <header class="flex items-center justify-between">
    <div>
      <h3 class="text-sm font-semibold">{debtorName}</h3>
      <p class="text-xs text-zinc-500">{new Date(sale.createdAt).toLocaleString()}</p>
    </div>
  {#if sale.status === 'pending'}
      <span class="inline-flex items-center gap-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-md">
        Pendiente
      </span>
    {:else}
      <span class="inline-flex items-center gap-2 text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md">
        Entregado
      </span>
    {/if}
  </header>

  <div class="mt-3 text-sm">
    <ul class="space-y-1">
      {#each sale.items as it}
        <li class="flex justify-between">
          <span class="text-zinc-700">{it.product} × {it.quantity}</span>
          <span class="font-medium">{currency(it.unitPrice * it.quantity)}</span>
        </li>
      {/each}
    </ul>
  </div>

  <footer class="mt-3 flex items-center justify-between">
    <div class="text-xs text-zinc-600">
      Total: <span class="text-zinc-900 font-semibold">{currency(sale.total)}</span>
      {#if sale.status === 'pending'}
        • {daysSince(sale.createdAt)} días sin pagar
      {:else if sale.deliveredAt}
        • Entregado hace {daysSince(sale.deliveredAt)} días
      {/if}
    </div>
    {#if sale.status === 'pending'}
      <button type="button" class="inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium shadow-sm active:scale-[.98] transition bg-emerald-600 text-white hover:bg-emerald-500" onclick={() => onMarkDelivered(sale.id)}>Marcar entregado</button>
    {/if}
  </footer>
</article>

