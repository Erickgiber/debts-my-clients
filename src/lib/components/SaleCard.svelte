<script lang="ts">
  import type { Sale, SaleItem } from '$lib/core/types';
  import { currency, daysSince } from '$lib/core/utils';

  let {
    sale,
    debtorName,
    onMarkDelivered,
    onEdit,
  }: {
    sale: Sale;
    debtorName: string;
    onMarkDelivered: (id: string) => void;
    onEdit?: (
      saleId: string,
      payload: {
        items: Array<Pick<SaleItem, 'id' | 'product' | 'quantity' | 'unitPrice'>>;
        paid: boolean;
        debtorName?: string;
      },
    ) => void;
  } = $props();

  let editing = $state(false);
  let draftItems = $state<Array<Pick<SaleItem, 'id' | 'product' | 'quantity' | 'unitPrice'>>>([]);
  let draftPaid = $state(false);
  let draftDebtorName = $state('');

  function startEdit() {
    draftItems = sale.items.map((it) => ({
      id: it.id,
      product: it.product,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    }));
    draftPaid = sale.status === 'delivered';
    draftDebtorName = debtorName;
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
    onEdit?.(sale.id, {
      items: draftItems,
      paid: draftPaid,
      debtorName: nameChanged ? name : undefined,
    });
    editing = false;
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
      {#if sale.status !== 'pending'}
        <div class="flex items-center gap-2">
          <input id={`paid-${sale.id}`} type="checkbox" class="size-4" bind:checked={draftPaid} />
          <label class="text-sm" for={`paid-${sale.id}`}>Pagado</label>
        </div>
      {/if}
      {#each draftItems as it, i (it.id)}
        <div class="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
          <input
            class="rounded-lg border border-zinc-200 px-2 py-1 text-sm"
            bind:value={draftItems[i].product}
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
        </div>
      {/each}
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
          <li class="flex justify-between">
            <span class="text-zinc-700">{it.product} × {it.quantity}</span>
            <span class="font-medium">{currency(it.unitPrice * it.quantity)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <footer class="mt-3 flex items-center justify-between">
    <div class="text-xs text-zinc-600">
      Total: <span class="font-semibold text-zinc-900">{currency(sale.total)}</span>
      {#if sale.status === 'pending'}
        • {daysSince(sale.createdAt)} días pendiente de pago
      {:else if sale.deliveredAt}
        • Pagado hace {daysSince(sale.deliveredAt)} días
      {/if}
    </div>
    <div class="flex items-center gap-2">
      {#if sale.status === 'pending' && !editing}
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500 active:scale-[.98]"
          onclick={() => onMarkDelivered(sale.id)}>Marcar pagado</button
        >
      {/if}
    </div>
  </footer>
</article>
