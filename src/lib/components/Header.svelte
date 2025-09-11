<script lang="ts">
  let { totalPending = 0, totalLabel = 'Pendiente', onAdd, onExport }: { totalPending?: string | number; totalLabel?: string; onAdd: () => void; onExport?: () => void } = $props()
</script>

<header class="sticky top-0 z-10 backdrop-blur bg-white/70 border-b border-zinc-200">
  <div class="mx-auto max-w-lg px-4 py-3 flex items-center gap-3">
    <div class="flex-1">
      <h1 class="text-lg font-semibold tracking-tight">Deudas & Ventas</h1>
  <p class="text-xs text-zinc-500">{totalLabel}: <span class="font-medium">{totalPending}</span></p>
    </div>
    <button
      class="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium shadow-sm active:scale-[.98] transition bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
      onclick={onExport}
      aria-label="Exportar pendientes a PDF"
      type="button"
    >PDF</button>
    <button
      class="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium shadow-sm active:scale-[.98] transition bg-zinc-900 text-white hover:bg-zinc-800"
      onclick={onAdd}
      aria-label="Nueva venta"
      type="button"
    >
      +
    </button>
  </div>
</header>
