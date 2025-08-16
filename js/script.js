const swiper = new Swiper('.swiper', {
  loop: true,
  speed: 500, // скорость анимации в мс (резкая смена)
  autoplay: {
    delay: 3000, // задержка между слайдами
    disableOnInteraction: false,
  },
  effect: 'slide', // стандартный сдвиг
});
