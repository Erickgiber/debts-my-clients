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

  // Estado menú lateral móvil
  let isMenuOpen = $state(false);
  let menuButton = $state<HTMLButtonElement | null>(null);
  let drawerNav = $state<HTMLElement | null>(null);

  const focusFirstInDrawer = () => {
    if (!drawerNav) return;
    const first = drawerNav.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  };

  const toggleMenu = () => {
    if (isMenuOpen) {
      isMenuOpen = false;
      queueMicrotask(() => menuButton?.focus());
    } else {
      isMenuOpen = true;
      queueMicrotask(focusFirstInDrawer);
    }
  };
  const closeMenu = () => {
    if (!isMenuOpen) return;
    isMenuOpen = false;
    queueMicrotask(() => menuButton?.focus());
  };
</script>

<header
  class="sticky top-0 z-40 border-b border-zinc-200 bg-white/70 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70"
>
  <div class="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3">
    <!-- Botón menú hamburguesa solo móvil -->
    <button
      type="button"
      class="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white/90 px-2.5 py-2 text-zinc-700 shadow-sm shadow-zinc-950/5 active:scale-[.96] md:hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
      aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
      aria-expanded={isMenuOpen}
      aria-controls="mobile-drawer"
      onclick={toggleMenu}
      bind:this={menuButton}
    >
      {#if !isMenuOpen}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
          class="opacity-80"
          ><path
            fill="currentColor"
            stroke="currentColor"
            stroke-width="1"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 7.5h16M4 12h16M10 16.5h10"
          /></svg
        >
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
          class="opacity-80"
          ><path
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 6l12 12M18 6l-12 12"
          /></svg
        >
      {/if}
    </button>

    <div class="min-w-0 flex-1">
      <div class="mb-1.5 flex flex-wrap items-center gap-1.5">
        <h1 class="text-lg font-semibold tracking-tight">
          {mode === 'sales' ? 'Gestor de ventas' : 'Gestor de deudas'}
        </h1>
        <div class="hidden items-center gap-1.5 md:flex">
          <ModeToggle />
          <ThemeToggle />
        </div>
      </div>
      <p class="space-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        <span
          >{mode === 'sales' ? 'Ventas' : 'Deudas'}:
          <span class="font-medium">{totalSales}</span></span
        ><br />
        <span>{totalLabel}: <span class="font-medium dark:text-zinc-200">{totalPending}</span></span
        >
        {#if bolivarRate && typeof totalPendingRaw === 'number'}<br />
          <span class="text-[10px] text-zinc-400 dark:text-zinc-500"
            >≈ Bs {(totalPendingRaw * bolivarRate).toFixed(2)}
            {#if bolivarRateUpdatedAt}<span class="ml-1 opacity-60"
                >{new Date(bolivarRateUpdatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}</span
              >{/if}</span
          >
        {/if}
      </p>
    </div>

    <!-- Botón Nueva Venta / Deuda (siempre visible) -->
    <div class="group relative inline-block">
      <button
        class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-gradient-to-b from-white/90 to-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm ring-0 shadow-zinc-950/5 transition duration-150 hover:border-zinc-300 hover:from-white hover:to-zinc-100 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 active:scale-[.97] active:shadow-inner md:cursor-pointer dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-800/80 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:from-zinc-700 dark:hover:to-zinc-700"
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
          class="text-zinc-600 transition group-hover:text-zinc-700 dark:text-zinc-300 dark:group-hover:text-zinc-200"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M19 11h-6V5a1 1 0 0 0-2 0v6H5a1 1 0 0 0 0 2h6v6a1 1 0 0 0 2 0v-6h6a1 1 0 0 0 0-2"
          />
        </svg>
        <span
          class="hidden text-[13px] font-semibold tracking-tight md:inline-block dark:text-zinc-100"
        >
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
          class="pointer-events-none absolute top-full left-1/2 z-20 mt-2 -translate-x-1/2 rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg ring-1 ring-black/5 transition duration-150 group-focus-within:opacity-100 group-hover:opacity-100 dark:bg-zinc-800 dark:ring-white/10"
        >
          {mode === 'sales' ? 'Crear nueva venta' : 'Registrar nueva deuda'}
          <span
            class="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-zinc-900 dark:bg-zinc-800"
          ></span>
        </div>
      {/if}
    </div>
  </div>
</header>

<!-- Overlay -->
{#if isMenuOpen}
  <button
    type="button"
    class="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] md:hidden"
    aria-label="Cerrar menú"
    onclick={closeMenu}
  ></button>
{/if}

<!-- Drawer -->
<nav
  id="mobile-drawer"
  class="fixed top-0 left-0 z-40 h-full w-72 max-w-[80%] transform border-r border-zinc-200 bg-white/95 px-4 pt-5 pb-16 shadow-xl ring-1 shadow-zinc-950/10 ring-black/5 backdrop-blur transition duration-300 ease-in-out md:hidden dark:border-zinc-800 dark:bg-zinc-900/95 dark:shadow-black/40"
  style="transform: translateX({isMenuOpen ? '0%' : '-105%'});"
  aria-hidden={!isMenuOpen}
>
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-200">Menú</h2>
    <button
      type="button"
      class="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-zinc-400 dark:hover:text-zinc-200"
      aria-label="Cerrar menú"
      onclick={closeMenu}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"><path d="M6 6l12 12M18 6l-12 12" /></svg
      >
    </button>
  </div>
  <div class="space-y-5 overflow-y-auto pr-1">
    <!-- Resumen -->
    <div
      class="rounded-lg border border-zinc-200/70 bg-white/70 p-3 text-[11px] leading-relaxed shadow-sm dark:border-zinc-700/70 dark:bg-zinc-800/40"
    >
      <p class="text-zinc-500 dark:text-zinc-400">
        <span class="block"
          >{mode === 'sales' ? 'Ventas' : 'Deudas'}:
          <span class="font-medium text-zinc-700 dark:text-zinc-200">{totalSales}</span></span
        >
        <span class="block"
          >{totalLabel}:
          <span class="font-medium text-zinc-700 dark:text-zinc-200">{totalPending}</span></span
        >
        {#if bolivarRate && typeof totalPendingRaw === 'number'}
          <span class="mt-1 block text-[10px] text-zinc-400 dark:text-zinc-500"
            >≈ Bs {(totalPendingRaw * bolivarRate).toFixed(2)}
            {#if bolivarRateUpdatedAt}<span class="ml-0.5 opacity-60"
                >{new Date(bolivarRateUpdatedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}</span
              >{/if}</span
          >
        {/if}
      </p>
    </div>

    <!-- Acciones -->
    <div class="space-y-3">
      {#if onExport}
        <button
          type="button"
          class="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white/80 px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm shadow-zinc-950/5 hover:border-zinc-300 hover:bg-white active:scale-[.97] dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
          onclick={() => {
            onExport?.();
            closeMenu();
          }}
        >
          <span class="inline-flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
              class="text-zinc-500 dark:text-zinc-400"
              ><path
                fill="currentColor"
                d="M7 2.75A2.75 2.75 0 0 0 4.25 5.5v13A2.75 2.75 0 0 0 7 21.25h10A2.75 2.75 0 0 0 19.75 18.5v-9.94c0-.46-.183-.9-.51-1.23l-4.57-4.56a1.75 1.75 0 0 0-1.24-.52zM13.5 3.94c.15.05.29.13.4.25l4.47 4.47a.75.75 0 0 1 .22.53H14A.5.5 0 0 1 13.5 8.7zM8.75 12A.75.75 0 0 1 9.5 11.25h5a.75.75 0 0 1 0 1.5h-5A.75.75 0 0 1 8.75 12m0 3A.75.75 0 0 1 9.5 14.25h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75"
              /></svg
            >
            Exportar PDF
          </span>
          <span
            class="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-rose-400 to-fuchsia-500 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
          ></span>
        </button>
      {/if}

      <!-- Toggles (para móvil dentro del drawer) -->
      <div class="flex items-center gap-2">
        <ModeToggle />
        <ThemeToggle />
      </div>
    </div>
  </div>
</nav>

<!-- Ajuste de accesibilidad: ocultar contenido principal al abrir menú (opcional futuro) -->
<!-- Se podría añadir aria-hidden en main con un $effect si fuese necesario -->
