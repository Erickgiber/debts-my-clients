<script lang="ts">
  let {
    totalPending = 0,
    totalLabel = 'Pendiente',
    onAdd,
    onExport,
  }: {
    totalPending?: string | number;
    totalLabel?: string;
    onAdd: () => void;
    onExport?: () => void;
  } = $props();
</script>

<header class="sticky top-0 z-10 border-b border-zinc-200 bg-white/70 backdrop-blur">
  <div class="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
    <div class="flex-1">
      <h1 class="text-lg font-semibold tracking-tight">Gestor de ventas</h1>
      <p class="text-xs text-zinc-500">
        {totalLabel}: <span class="font-medium">{totalPending}</span>
      </p>
    </div>
    <button
      class="inline-flex items-center justify-center rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-200 active:scale-[.98]"
      onclick={onExport}
      aria-label="Exportar pendientes a PDF"
      type="button">PDF</button
    >
    <button
      class="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[.98]"
      onclick={onAdd}
      aria-label="Nueva venta"
      type="button"
    >
      +
    </button>
  </div>
</header>
