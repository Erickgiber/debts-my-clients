// Utilidad para mostrar un toast simple (actualización SW u otros avisos rápidos)
export function showUpdatingToast(ver: string) {
  if (typeof document === 'undefined') return;
  // Evitar duplicados
  if (document.getElementById('sw-updating-toast')) return;
  const div = document.createElement('div');
  div.id = 'sw-updating-toast';
  div.textContent = `Actualizando… (v ${ver})`;
  div.className = [
    'fixed',
    'bottom-4',
    'left-1/2',
    '-translate-x-1/2',
    'px-4',
    'py-2',
    'text-xs',
    'font-medium',
    'rounded-full',
    'text-white',
    'shadow-lg',
    'z-[9999]',
    'select-none',
    'bg-zinc-900/95',
    'backdrop-blur',
    'opacity-0',
    'translate-y-2',
    'transition',
    'duration-200',
    'ease-out',
  ].join(' ');
  div.setAttribute('role', 'status');
  div.setAttribute('aria-live', 'polite');
  document.body.appendChild(div);
  requestAnimationFrame(() => {
    div.classList.remove('opacity-0', 'translate-y-2');
    div.classList.add('opacity-100', 'translate-y-0');
  });
}
