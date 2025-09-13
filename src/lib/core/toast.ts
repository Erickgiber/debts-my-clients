// Utilidad para mostrar un toast simple (actualización SW u otros avisos rápidos)
export function showUpdatingToast(
  newVer: string,
  currentVer: string | null,
  onConfirm: () => void,
) {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('sw-updating-toast');
  if (existing) return;
  const container = document.createElement('div');
  container.id = 'sw-updating-toast';
  container.className = [
    'fixed',
    'bottom-4',
    'left-1/2',
    '-translate-x-1/2',
    'w-[calc(100%-1.5rem)]',
    'max-w-sm',
    'px-4',
    'py-3',
    'rounded-xl',
    'shadow-lg',
    'z-[9999]',
    'bg-white/90',
    'backdrop-blur',
    'ring',
    'ring-zinc-200',
    'border',
    'border-zinc-100',
    'text-zinc-800',
    'opacity-0',
    'translate-y-3',
    'transition',
    'duration-300',
    'ease-out',
    'font-sans',
  ].join(' ');

  container.innerHTML = `
    <div class="flex flex-col gap-2">
      <div class="text-sm font-medium">Se ha detectado una nueva versión</div>
  <p class="text-xs leading-relaxed text-zinc-600">Versión actual: <span class="font-mono">${currentVer ?? '—'}</span><br/>Nueva versión: <span class="font-semibold">${newVer}</span>. ¿Actualizar ahora?</p>
      <div class="flex items-center gap-2 justify-end">
        <button type="button" data-action="later" class="text-[11px] px-3 py-1.5 rounded-md font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition">Más tarde</button>
        <button type="button" data-action="reload" class="text-[11px] px-3 py-1.5 rounded-md font-semibold text-white bg-zinc-900 hover:bg-zinc-800 active:scale-[.97] transition shadow-sm">Actualizar ahora</button>
      </div>
    </div>
  `;

  document.body.appendChild(container);
  requestAnimationFrame(() => {
    container.classList.remove('opacity-0', 'translate-y-3');
    container.classList.add('opacity-100', 'translate-y-0');
  });

  const laterBtn = container.querySelector('[data-action="later"]') as HTMLButtonElement | null;
  const reloadBtn = container.querySelector('[data-action="reload"]') as HTMLButtonElement | null;

  laterBtn?.addEventListener('click', () => {
    container.classList.add('opacity-0', 'translate-y-3');
    setTimeout(() => container.remove(), 250);
  });
  reloadBtn?.addEventListener('click', () => {
    reloadBtn.disabled = true;
    reloadBtn.classList.add('opacity-70');
    onConfirm();
  });
}
