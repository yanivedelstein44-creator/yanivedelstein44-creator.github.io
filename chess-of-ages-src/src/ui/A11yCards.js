/**
 * [a11y] Shop cards: the whole card is tappable to preview the item, and it also holds the Buy / Equip button.
 * A role="button" card with a button inside is "nested interactive" (WCAG 4.1.2), and its Enter/Space handler
 * swallowed the inner button's keyboard activation (Enter on "Buy" previewed instead of buying).
 * This turns every card into a named group with one transparent full-size "Preview" button (the card's own click
 * handler still runs, because the click bubbles up), and lets the inner buttons handle Enter/Space themselves.
 * Works on any container: it runs now and again whenever the container's children are re-rendered.
 */
export function fixShopCards(root, label) {
  const previewLabel = typeof label === 'function' ? label() : label;
  root.querySelectorAll('.card[role="button"]').forEach((card) => {
    const name = card.getAttribute('aria-label') || '';
    card.setAttribute('role', 'group');
    card.removeAttribute('tabindex');
    const hit = document.createElement('button');
    hit.type = 'button';
    hit.className = 'card-hit';
    hit.setAttribute('aria-label', previewLabel ? `${previewLabel}: ${name}` : name);
    hit.setAttribute('aria-pressed', String(card.classList.contains('sel')));
    card.prepend(hit);
    card.querySelectorAll('button:not(.card-hit)').forEach((b) => b.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
    }));
  });
}

/** Keeps a re-rendered grid accessible: fixes the current cards and every new set of cards */
export function watchShopCards(grid, previewLabel) {
  fixShopCards(grid, previewLabel);
  if (typeof MutationObserver === 'undefined') return;
  new MutationObserver(() => fixShopCards(grid, previewLabel)).observe(grid, { childList: true });
}
