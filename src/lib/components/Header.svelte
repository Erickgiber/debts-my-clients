<script lang="ts">
  import { appMode, type AppMode } from '$lib/core/mode';
  import ModeToggle from '$lib/components/ModeToggle.svelte';
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { get } from 'svelte/store';

  let {
    totalPending = 0,
    totalPendingRaw = null,
    totalLabel = 'Pendiente',
    onAdd,
    onExport,
    bolivarRate = null,
    bolivarRateUpdatedAt = null,
    totalSales = 0,
    isDesktop = false,
    mode = get(appMode),
  }: {
    totalPending?: string | number;
    totalPendingRaw?: number | null;
    totalLabel?: string;
    onAdd: () => void;
    onExport?: () => void;
    bolivarRate?: number | null;
    bolivarRateUpdatedAt?: string | null;
    totalSales?: number;
    isDesktop?: boolean;
    mode?: AppMode;
    onToggleMode?: (next: AppMode) => void;
  } = $props();
</script>

<header
  class="sticky top-0 z-10 border-b border-zinc-200 bg-white/70 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70"
>
  <div class="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3">
    <div class="flex-1">
      <div class="mb-1.5 flex flex-wrap items-center gap-1.5">
        <h1 class="text-lg font-semibold tracking-tight">
          {mode === 'sales' ? 'Gestor de ventas' : 'Gestor de deudas'}
        </h1>
        <ModeToggle />
        <ThemeToggle />
      </div>
      <p class="space-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        <span
          >{mode === 'sales' ? 'Ventas' : 'Deudas'}:
          <span class="font-medium">{totalSales}</span></span
        ><br />
        <span>{totalLabel}: <span class="font-medium dark:text-zinc-200">{totalPending}</span></span
        >
        {#if bolivarRate && typeof totalPendingRaw === 'number'}
          <br />
          <span class="text-[10px] text-zinc-400 dark:text-zinc-500">
            ≈ Bs {(totalPendingRaw * bolivarRate).toFixed(2)}
            {#if bolivarRateUpdatedAt}
              <span class="ml-1 opacity-60"
                >{new Date(bolivarRateUpdatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}</span
              >
            {/if}
          </span>
        {/if}
      </p>
    </div>

    {#if isDesktop}
      <div class="group relative inline-block">
        <button
          class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-gradient-to-b from-white/90 to-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm ring-0 shadow-zinc-950/5 transition duration-150 hover:border-zinc-300 hover:from-white hover:to-zinc-100 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 active:scale-[.97] active:shadow-inner md:cursor-pointer"
          onclick={onExport}
          aria-label="Exportar lista de deudores en PDF"
          aria-describedby="pdf-export-tip"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="18"
            height="18"
            class="text-zinc-600 transition group-hover:text-zinc-700"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M7 2.75A2.75 2.75 0 0 0 4.25 5.5v13A2.75 2.75 0 0 0 7 21.25h10A2.75 2.75 0 0 0 19.75 18.5v-9.94c0-.46-.183-.9-.51-1.23l-4.57-4.56a1.75 1.75 0 0 0-1.24-.52zM13.5 3.94c.15.05.29.13.4.25l4.47 4.47a.75.75 0 0 1 .22.53H14A.5.5 0 0 1 13.5 8.7zM8.75 12A.75.75 0 0 1 9.5 11.25h5a.75.75 0 0 1 0 1.5h-5A.75.75 0 0 1 8.75 12m0 3A.75.75 0 0 1 9.5 14.25h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75"
            />
          </svg>
          <span class="text-[13px] font-semibold tracking-tight">PDF</span>
          <span
            class="relative -mr-1 inline-flex h-1.5 w-1.5 overflow-hidden rounded-full bg-gradient-to-br from-rose-400 to-fuchsia-500 opacity-60 shadow-[0_0_0_1px_rgba(0,0,0,0.08)] group-hover:opacity-100"
          ></span>
        </button>
        {#if isDesktop}
          <div
            id="pdf-export-tip"
            role="tooltip"
            class="pointer-events-none absolute top-full left-1/2 z-20 mt-2 -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg ring-1 ring-black/5 transition duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
          >
            Exportar lista de deudores en PDF
            <span class="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-zinc-900"
            ></span>
          </div>
        {/if}
      </div>
    {/if}

    <div class="group relative inline-block">
      <button
        class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-gradient-to-b from-white/90 to-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm ring-0 shadow-zinc-950/5 transition duration-150 hover:border-zinc-300 hover:from-white hover:to-zinc-100 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 active:scale-[.97] active:shadow-inner md:cursor-pointer"
        onclick={onAdd}
        aria-label={mode === 'sales' ? 'Nueva venta' : 'Nueva deuda'}
        aria-describedby="new-sale-tip"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          class="text-zinc-600 transition group-hover:text-zinc-700"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M19 11h-6V5a1 1 0 0 0-2 0v6H5a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0v-6h6a1 1 0 0 0 0-2"
          />
        </svg>
        <span class="hidden text-[13px] font-semibold tracking-tight md:inline-block">
          {mode === 'sales' ? 'Nueva venta' : 'Nueva deuda'}
        </span>
        <span
          class="relative -mr-1 hidden h-1.5 w-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 opacity-70 shadow-[0_0_0_1px_rgba(0,0,0,0.15)] transition group-hover:opacity-100 md:inline-block"
        ></span>
      </button>
      {#if isDesktop}
        <div
          id="new-sale-tip"
          role="tooltip"
          class="pointer-events-none absolute top-full left-1/2 z-20 mt-2 -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg ring-1 ring-black/5 transition duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
        >
          {mode === 'sales' ? 'Crear nueva venta' : 'Registrar nueva deuda'}
          <span class="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-zinc-900"
          ></span>
        </div>
      {/if}
    </div>
  </div>
</header>
