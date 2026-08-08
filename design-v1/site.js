const button = document.querySelector('.menu-button');
const navigation = document.querySelector('.main-nav');

button?.addEventListener('click', () => {
  const open = button.getAttribute('aria-expanded') === 'true';
  button.setAttribute('aria-expanded', String(!open));
  navigation?.classList.toggle('is-open', !open);
});

navigation?.addEventListener('click', (event) => {
  if (!(event.target instanceof Element) || !event.target.closest('a')) return;
  button?.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
});
