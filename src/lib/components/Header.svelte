<script lang="ts">
  let {
    totalPending = 0, // formatted or raw
    totalPendingRaw = null, // numeric base value in USD
    totalLabel = 'Pendiente',
    onAdd,
    onExport,
    bolivarRate = null,
    bolivarRateUpdatedAt = null,
    totalSales = 0,
  }: {
    totalPending?: string | number;
    totalPendingRaw?: number | null;
    totalLabel?: string;
    onAdd: () => void;
    onExport?: () => void;
    bolivarRate?: number | null;
    bolivarRateUpdatedAt?: string | null;
    totalSales?: number;
  } = $props();

  const version = (import.meta as any).env.VITE_APP_VERSION;
</script>

<header class="sticky top-0 z-10 border-b border-zinc-200 bg-white/70 backdrop-blur">
  <div class="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
    <div class="flex-1">
      <h1 class="text-lg font-semibold tracking-tight">Gestor de ventas</h1>
      <p class="space-y-0.5 text-xs text-zinc-500">
        <span>Ventas: <span class="font-medium">{totalSales}</span></span><br />
        <span>{totalLabel}: <span class="font-medium">{totalPending}</span></span>
        {#if bolivarRate && typeof totalPendingRaw === 'number'}
          <br />
          <span class="text-[10px] text-zinc-400">
            ≈ Bs {(totalPendingRaw * bolivarRate).toFixed(2)}
            {#if bolivarRateUpdatedAt}
              <span class="ml-1 opacity-60">
                {new Date(bolivarRateUpdatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            {/if}
          </span>
        {/if}
      </p>
    </div>
    <!-- <button
      class="inline-flex items-center justify-center rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-200 active:scale-[.98]"
      onclick={onExport}
      aria-label="Exportar pendientes a PDF"
      type="button">PDF</button
    > -->

    <button
      class="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-2.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 active:scale-[.98]"
      onclick={onAdd}
      aria-label="Nueva venta"
      type="button"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M19 11h-6V5a1 1 0 0 0-2 0v6H5a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0v-6h6a1 1 0 0 0 0-2"
        />
      </svg>
    </button>
  </div>
</header>
