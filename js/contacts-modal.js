// contacts-modal.js
document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('openContactsBtn');
  const modal = document.getElementById('contactsModal');
  const closeBtn = document.getElementById('closeContactsBtn');

  // ✅ На экранах <= 1024px: полностью отключаем логику модалки и скрываем элементы
  if (window.innerWidth <= 1024) {
    if (openBtn) openBtn.style.display = 'none';
    if (modal) modal.style.display = 'none';
    return;
  }

  if (!openBtn || !modal || !closeBtn) return;

  // Десктопное поведение:
  openBtn.addEventListener('click', () => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});