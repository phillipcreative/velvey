;(function () {
	const controlMegaMenu = (header) => {
		const megaMenuLinks = header.querySelectorAll('.list-menu--megamenu')
		if (!megaMenuLinks || !megaMenuLinks.length) return

		megaMenuLinks.forEach((link) => {
			link.addEventListener('mouseenter', () => {
				link.classList.add('list-menu--megamenu-visible')

				link.addEventListener('mousemove', () => {
					link.classList.add('list-menu--megamenu-visible')
				})

				link.addEventListener('mouseleave', () => {
					link.classList.remove('list-menu--megamenu-visible')
					link.addEventListener('mouseenter', () => {
						link.classList.add('list-menu--megamenu-visible')
					})
				})
			})
		})
	}

	const calcMegaMenuPosition = (header) => {
		const isBottomMenuType = Boolean(header.querySelector("header.header--bottom-menu"))
		if (!isBottomMenuType) return

		const megaMenuLinks = header.querySelectorAll('.list-menu--megamenu')
		if (!megaMenuLinks || !megaMenuLinks.length) return

		const headerBottom = header.querySelector('.header__bottom')
		if (!headerBottom) return

		const headerBottomRect = headerBottom.getBoundingClientRect()

		megaMenuLinks.forEach((link) => {
			const menuLi = link.querySelector('.header__mega-menu')
			const headerLi = link.querySelector('.header__menu-item')

			if (!menuLi || !headerLi) return

			const headerRect = headerLi.getBoundingClientRect()

			const verticalDistance = Math.abs(
				headerRect.bottom - headerBottomRect.bottom
			)

			menuLi.style.top = `calc(100% - ${verticalDistance}px)`
		})
	}

	const controlMegaSubmenu = (header) => {
		const megaSubmenuLinks = header.querySelectorAll('.list-menu--megasubmenu')
		megaSubmenuLinks.forEach((link) => {
			link.addEventListener('mouseenter', () => {
				link.classList.add('list-menu--megasubmenu-visible')

				link.addEventListener('mousemove', () => {
					link.classList.add('list-menu--megasubmenu-visible')
				})

				link.addEventListener('mouseleave', () => {
					link.classList.remove('list-menu--megasubmenu-visible')
					link.addEventListener('mouseenter', () => {
						link.classList.add('list-menu--megasubmenu-visible')
					})
				})
			})

			const tabs = link.querySelectorAll('.mega-submenu__tab')
			const submenus = link.querySelectorAll('.mega-submenu__submenu')

			const onToggle = (event) => {
				const tab = event.target
				if (!tab || !tab.classList.contains('mega-submenu__tab')) return
				const tabId = tab.dataset.tabId

				tabs.forEach((tab) => {
					tab.classList.remove('active')
				})
				tab.classList.add('active')
				submenus.forEach((submenu) => {
					submenu.classList.remove('active')
					if (submenu.dataset.tabId === tabId) {
						submenu.classList.add('active')
					}
				})
			}
		
			tabs.forEach((tab) => {
				tab.addEventListener('click', onToggle)
				tab.addEventListener('mouseenter', onToggle)
			})
		})
	}

	const checkMegaSubmenuPosition = (header) => {
		const megaSubmenuLinks = header.querySelectorAll('.list-menu--megasubmenu')
		const headerRect = header.getBoundingClientRect();

		megaSubmenuLinks.forEach((link) => {
			const megaSubmenu = link.querySelector('.mega-submenu')
			megaSubmenu.style.removeProperty("max-width");

			const linkRect = link.getBoundingClientRect();
			const availableWidth = headerRect.right - linkRect.left
			if (availableWidth < 1000) {
				megaSubmenu.style.maxWidth  = `calc(${availableWidth}px - 16px)`;
			}
		});
	};

	const calcHeaderHeightTop = (header) => {
		const headerTop = document.querySelector('.shopify-section-header .header__top');
		if (!headerTop) return;

		const headerTopHeight = header.getBoundingClientRect().height.toFixed(4);
		document.documentElement.style.setProperty('--header-height-top', `${headerTopHeight}px`);
	}

	const initHeader = () => {
		const header = document.querySelector(".shopify-section-header")
		if (!header) return

		controlMegaMenu(header)
		controlMegaSubmenu(header)

		const observer = new ResizeObserver((entries) => {
			entries.forEach((entry) => {
				calcMegaMenuPosition(header);
				checkMegaSubmenuPosition(header);
				calcHeaderHeightTop(header);
			});
		});

		observer.observe(header);
	}

	document.addEventListener('DOMContentLoaded', initHeader)
	document.addEventListener('shopify:section:load', initHeader)
})()
