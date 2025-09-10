<script lang="ts">
  import type { NewSaleForm } from '$lib/core/types'

  let { open = false, onsubmit, oncancel }: { open?: boolean; onsubmit?: (detail: NewSaleForm) => void; oncancel?: () => void } = $props()

  let form: NewSaleForm = $state({
    debtorName: '',
    phone: '',
    product: '',
    quantity: 1,
    unitPrice: 0,
    delivered: false,
    notes: '',
  })

  function reset() {
    form = { debtorName: '', phone: '', product: '', quantity: 1, unitPrice: 0, delivered: false, notes: '' }
  }

  function onSubmit(e: Event) {
    e.preventDefault()
    if (!form.debtorName?.trim() || !form.product?.trim() || form.quantity <= 0 || form.unitPrice < 0) return
    onsubmit?.(form)
    reset()
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex">
  <button type="button" class="flex-1 bg-black/40" onclick={() => oncancel?.()} aria-label="Cerrar"></button>
    <aside class="w-full max-w-md ml-auto h-full bg-white rounded-l-2xl shadow-xl p-4 overflow-y-auto">
      <header class="flex items-center justify-between gap-2">
        <h2 class="text-base font-semibold">Nueva venta</h2>
    <button type="button" class="size-8 rounded-lg hover:bg-zinc-100 grid place-content-center" onclick={() => oncancel?.()} aria-label="Cerrar">✕</button>
      </header>

    <form class="mt-4 space-y-4" onsubmit={onSubmit}>
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="cliente">Cliente</label>
          <input id="cliente" class="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 ring-zinc-300 bg-white" placeholder="Nombre" bind:value={form.debtorName} required />
        </div>
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="telefono">Teléfono</label>
          <input id="telefono" class="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 ring-zinc-300 bg-white" placeholder="Opcional" bind:value={form.phone} />
        </div>
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="producto">Producto</label>
          <input id="producto" class="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 ring-zinc-300 bg-white" placeholder="Descripción" bind:value={form.product} required />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-1">
            <label class="text-xs text-zinc-600" for="cantidad">Cantidad</label>
            <input id="cantidad" class="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 ring-zinc-300 bg-white" type="number" min="1" bind:value={form.quantity} required />
          </div>
          <div class="grid gap-1">
            <label class="text-xs text-zinc-600" for="unitprice">Precio unitario</label>
            <input id="unitprice" class="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 ring-zinc-300 bg-white" type="number" step="0.01" min="0" bind:value={form.unitPrice} required />
          </div>
        </div>
        <div class="flex items-center gap-2">
      <input id="delivered" type="checkbox" bind:checked={form.delivered} class="size-4" />
          <label for="delivered" class="text-sm">Entregado</label>
        </div>
        <div class="grid gap-1">
          <label class="text-xs text-zinc-600" for="notas">Notas</label>
          <textarea id="notas" class="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 ring-zinc-300 bg-white min-h-20" placeholder="Opcional" bind:value={form.notes}></textarea>
        </div>

        <div class="pt-2 flex gap-3">
      <button type="button" class="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium shadow-sm active:scale-[.98] transition bg-zinc-200 text-zinc-900 hover:bg-zinc-300 flex-1" onclick={() => oncancel?.()}>Cancelar</button>
      <button type="submit" class="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium shadow-sm active:scale-[.98] transition bg-zinc-900 text-white hover:bg-zinc-800 flex-1">Guardar</button>
        </div>
      </form>
    </aside>
  </div>
{/if}

