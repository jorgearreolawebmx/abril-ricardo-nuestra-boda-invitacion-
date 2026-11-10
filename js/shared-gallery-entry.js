(() => {
  const toggle = document.getElementById('sharedGalleryHowToggle');
  const panel = document.getElementById('sharedGalleryHowPanel');
  if (!toggle || !panel) return;
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
  });
})();
