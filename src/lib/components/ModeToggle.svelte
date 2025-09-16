<script lang="ts">
  import { appMode, type AppMode } from '$lib/core/mode';
  import { showToast } from '$lib/core/toast';

  let mode = $state<AppMode>('sales');
  $effect.pre(() => {
    const unsub = appMode.subscribe((m) => (mode = m));
    return () => unsub();
  });

  /** Animación y feedback al cambiar */
  function toggle() {
    const next: AppMode = mode === 'sales' ? 'debts' : 'sales';
    appMode.set(next);
    // Toast estilizado breve con mensaje del modo
    showToast(`Modo: ${next === 'sales' ? 'Ventas' : 'Deudas'}`, { variant: 'info', ttlMs: 1800 });
  }
</script>

<button
  type="button"
  class="group relative inline-grid h-8 w-40 grid-cols-2 items-stretch overflow-hidden rounded-full bg-zinc-200 p-1 text-[11px] font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 active:scale-[.97] lg:cursor-pointer dark:bg-zinc-700 dark:text-zinc-200 dark:ring-zinc-600"
  aria-label="Cambiar modo"
  onclick={toggle}
>
  <!-- Knob rediseñado: usa left en lugar de translate para evitar overflow -->
  <span
    class="pointer-events-none absolute top-1 h-6 w-[calc(50%-4px)] rounded-full shadow ring-1 transition-all duration-300 ease-out"
    style={`left:${mode === 'sales' ? '4px' : 'calc(50% + 0px)'}`}
  ></span>
  <span
    class="relative z-10 flex items-center justify-center gap-1 rounded-full transition-colors duration-200"
    class:opacity-100={mode === 'sales'}
    class:opacity-60={mode !== 'sales'}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 32 32">
      <path
        fill="currentColor"
        d="M30 6V4h-3V2h-2v2h-1c-1.103 0-2 .898-2 2v2c0 1.103.897 2 2 2h4v2h-6v2h3v2h2v-2h1c1.103 0 2-.897 2-2v-2c0-1.102-.897-2-2-2h-4V6zm-6 14v2h2.586L23 25.586l-2.292-2.293a1 1 0 0 0-.706-.293H20a1 1 0 0 0-.706.293L14 28.586L15.414 30l4.587-4.586l2.292 2.293a1 1 0 0 0 1.414 0L28 23.414V26h2v-6zM4 30H2v-5c0-3.86 3.14-7 7-7h6c1.989 0 3.89.85 5.217 2.333l-1.49 1.334A5 5 0 0 0 15 20H9c-2.757 0-5 2.243-5 5zm8-14a7 7 0 1 0 0-14a7 7 0 0 0 0 14m0-12a5 5 0 1 1 0 10a5 5 0 0 1 0-10"
      />
    </svg>
    Ventas
  </span>
  <span
    class="relative z-10 flex items-center justify-center gap-1 rounded-full transition-colors duration-200"
    class:opacity-100={mode === 'debts'}
    class:opacity-60={mode !== 'debts'}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
      <g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5">
        <path
          stroke-linecap="round"
          d="M20.943 16.835a15.76 15.76 0 0 0-4.476-8.616c-.517-.503-.775-.754-1.346-.986C14.55 7 14.059 7 13.078 7h-2.156c-.981 0-1.472 0-2.043.233c-.57.232-.83.483-1.346.986a15.76 15.76 0 0 0-4.476 8.616C2.57 19.773 5.28 22 8.308 22h7.384c3.029 0 5.74-2.227 5.25-5.165"
        />
        <path
          d="M7.257 4.443c-.207-.3-.506-.708.112-.8c.635-.096 1.294.338 1.94.33c.583-.009.88-.268 1.2-.638C10.845 2.946 11.365 2 12 2s1.155.946 1.491 1.335c.32.37.617.63 1.2.637c.646.01 1.305-.425 1.94-.33c.618.093.319.5.112.8l-.932 1.359c-.4.58-.599.87-1.017 1.035S13.837 7 12.758 7h-1.516c-1.08 0-1.619 0-2.036-.164S8.589 6.38 8.189 5.8z"
        />
        <path
          stroke-linecap="round"
          d="M13.627 12.919c-.216-.799-1.317-1.519-2.638-.98s-1.53 2.272.467 2.457c.904.083 1.492-.097 2.031.412c.54.508.64 1.923-.739 2.304c-1.377.381-2.742-.214-2.89-1.06m1.984-5.06v.761m0 5.476v.764"
        />
      </g>
    </svg>
    Deudas
  </span>
</button>

<style>
  button:focus-visible span {
    outline: none;
  }
</style>
