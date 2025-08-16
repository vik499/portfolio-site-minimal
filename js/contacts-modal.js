document.addEventListener('DOMContentLoaded', () => {
  const openBtn = document.getElementById('openContactsBtn');
  const modal = document.getElementById('contactsModal');
  const closeBtn = document.getElementById('closeContactsBtn');

  // Открыть модалку по клику на кнопку
  openBtn.addEventListener('click', () => {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Запрет прокрутки фона
  });

  // Закрыть модалку по клику на крестик
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    document.body.style.overflow = ''; // Восстановить прокрутку
  });

  // Закрыть модалку, если кликнули вне содержимого (по фону)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Закрыть модалку по нажатию Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });
});
