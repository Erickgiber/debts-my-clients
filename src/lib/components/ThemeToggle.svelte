<script lang="ts">
  import { theme, toggleTheme } from '$lib/core/theme';
  let current = $state<'light' | 'dark'>('light');
  $effect.pre(() => {
    const unsub = theme.subscribe((v) => (current = v));
    return () => unsub();
  });
  const label = $derived(current === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  const isDark = $derived(current === 'dark');
</script>

<button
  type="button"
  class="group relative inline-flex h-8 w-10 items-center justify-center overflow-hidden rounded-xl border border-zinc-300 bg-white text-zinc-600 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40 active:scale-[.95] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
  aria-label={label}
  title={label}
  onclick={toggleTheme}
>
  <span class="relative inline-block">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-5 w-5 transition-all duration-300 ease-out"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      {#if isDark}
        <!-- Sun icon -->
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07 6.07-1.42-1.42M8.35 8.35 6.93 6.93m0 10.14 1.42-1.42m9.3-9.3-1.42 1.42"
        />
      {:else}
        <!-- Moon icon -->
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9" />
      {/if}
    </svg>
  </span>
</button>
