(function () {
  const productsFilters = (section) => {
    if (!section || !section.classList.contains('popular-products-section')) {
      return;
    }
    const filters = section.querySelectorAll('.filters__item');
    const wrappers = section.querySelectorAll('.popular-products__wrapper--filters');

    const onToggleTab = (event) => {
      event.preventDefault();
      const item = event.currentTarget;
      if (!item || !item.classList.contains('filters__item')) return;
      const filterTarget = item.dataset.filterTarget;

      filters.forEach((filterEl) => {
        filterEl.classList.remove('filters__item_active');
      });
      item.classList.add('filters__item_active');

      wrappers.forEach((wrapperEl) => {
        wrapperEl.classList.remove('active');
      });
      wrappers.forEach((wrapperEl) => {
        if (wrapperEl.dataset.filterTarget == filterTarget) {
          wrapperEl.classList.add('active');
        }
      });
    };

    filters.forEach((item) => {
      item.addEventListener('click', onToggleTab);
    });
  };

  productsFilters(document.currentScript.parentElement);

  document.addEventListener('shopify:section:load', function (event) {
    productsFilters(event.target);
  });
})();

