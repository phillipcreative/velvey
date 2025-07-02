document.addEventListener('DOMContentLoaded', () => {
  console.log('Broker Modal Init')
  // Open Property Process Modal
  const propertyBtn = document.querySelector('[data-property-management-btn]');
  const closeProcessBtn = document.querySelector('.cancel-btn');

  propertyBtn.addEventListener('click', async () => {
    console.log('Property Button Clicked')
    // Always fetch addresses from cart for persistence
    const cart = await fetch('/cart.js').then(res => res.json());
    // Parse addresses from cart items
    const cartAddresses = cart.items.filter(item => item.properties && (item.properties.BusinessName || item.properties.Street || item.properties.City || item.properties.State || item.properties.ZIP)).map(item => ({
      businessName: item.properties.BusinessName || '',
      street: item.properties.Street || '',
      city: item.properties.City || '',
      state: item.properties.State || '',
      zipcode: item.properties.ZIP || ''
    }));
    window.businessInfoList = cartAddresses;
    const hasAddress = cartAddresses.length > 0;
    if (hasAddress) {
      document.querySelector('.property-process').classList.add('show');
      document.querySelector('body').classList.add('no-scroll');
      document.querySelectorAll('.process').forEach(step => step.classList.add('hide'));
      document.querySelector('.final-process').classList.remove('hide');
      document.querySelector('.process-header h1').textContent = 'Review';
      // Set all previous steps as complete, last as active
      const steps = Array.from(document.querySelectorAll('.steps .step'));
      steps.forEach((step, idx) => {
        step.classList.remove('step--active', 'step--complete');
        if (idx < steps.length - 1) {
          step.classList.add('step--complete');
        } else if (idx === steps.length - 1) {
          step.classList.add('step--active');
        }
      });
      // Only render the property summary (Total)
      renderFinalOverview();
    } else {
      document.querySelector('.property-process').classList.add('show');
      document.querySelector('body').classList.add('no-scroll');
    }
  });

  closeProcessBtn.addEventListener('click', () => {
    document.querySelector('.property-process').classList.remove('show');
    document.querySelector('body').classList.remove('no-scroll');
  });

  // Utility function to set the active step in the stepper
  function setActiveStep(stepClass) {
    const steps = Array.from(document.querySelectorAll('.steps .step'));
    let foundActive = false;
    steps.forEach(step => {
      step.classList.remove('step--active', 'step--complete');
    });
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (step.classList.contains(stepClass)) {
        step.classList.add('step--active');
        foundActive = true;
        break;
      } else {
        step.classList.add('step--complete');
      }
    }
  }

  // Step 1: Service Selection
  const stepEls = document.querySelectorAll('.step-el');
  stepEls.forEach(step => {
    step.addEventListener('click', () => {
      const variantId = step.getAttribute('data-variant-id');
      window.selectedServiceVariantId = variantId;
      window.selectedServiceType = step.querySelector('h2')?.textContent?.trim() || '';
      const selectedServiceHTML = step.innerHTML;

      document.querySelector('.process-one').classList.add('hide');
      document.querySelector('.process-pmc').classList.remove('hide');
      document.querySelector('.process-header h1').textContent = 'Property Management Company';
      document.querySelector('.progress-container .progress').style.width = '33%';
      setActiveStep('process-icon-pmc');
      document.querySelector('.selected-service').innerHTML = selectedServiceHTML;
      document.querySelector('.selected-service-wrapper').classList.remove('hide');
    });
  });

  // Step 2: PMC Info Form
  const pmcForm = document.querySelector('.process-pmc .pmc-info');
  pmcForm.addEventListener('submit', function(e) {
    e.preventDefault();
    window.pmcInfo = {
      name: pmcForm.querySelector('[name="pmcName"]').value,
      street: pmcForm.querySelector('[name="pmcStreet"]').value,
      city: pmcForm.querySelector('[name="pmcCity"]').value,
      state: pmcForm.querySelector('[name="pmcState"]').value,
      zipcode: pmcForm.querySelector('[name="pmcZipcode"]').value
    };
    document.querySelector('.process-pmc').classList.add('hide');
    document.querySelector('.process-two').classList.remove('hide');
    document.querySelector('.process-header h1').textContent = 'Property Address Information';
    document.querySelector('.progress-container .progress').style.width = '50%';
    setActiveStep('process-icon-two');
    document.querySelector('.process-icon-pmc').classList.add('step--complete', 'step--inactive');
  });

  // Step 2: Business Info Form (single address, initial entry or add another)
  const businessForm = document.querySelector('.process-two .business-info');
  businessForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const form = businessForm;
    const businessInfo = {
      businessName: form.querySelector('[name="businessName"]').value,
      street: form.querySelector('[name="street"]').value,
      city: form.querySelector('[name="city"]').value,
      state: form.querySelector('[name="state"]').value,
      zipcode: form.querySelector('[name="zipcode"]').value
    };
    if (window.addingAnotherAddress) {
      if (!window.businessInfoList) window.businessInfoList = [];
      window.businessInfoList.push(businessInfo);
      window.addingAnotherAddress = false;
    } else {
      window.businessInfoList = [businessInfo];
    }
    document.querySelector('.process-two').classList.add('hide');
    document.querySelector('.process-three').classList.remove('hide');
    document.querySelector('.process-header h1').textContent = 'How Many Units Does The Property Have?';
    document.querySelector('.progress-container .progress').style.width = '75%';
    setActiveStep('process-icon-three');
    document.querySelector('.process-icon-two').classList.add('step--complete', 'step--inactive');
    // Show selected service in process-three as well
    const selectedServiceHTML = document.querySelector('.selected-service').innerHTML;
    const processThreeServiceWrapper = document.querySelector('.process-three .selected-service-wrapper');
    if (processThreeServiceWrapper) {
      processThreeServiceWrapper.classList.remove('hide');
      processThreeServiceWrapper.querySelector('.selected-service').innerHTML = selectedServiceHTML;
    }
  });

  // Step 3: Property Selection (final step to add to cart)
  const propertyOptions = document.querySelectorAll('.property-number-el');
  propertyOptions.forEach(option => {
    option.addEventListener('click', async () => {
      const recipientVariantId = option.getAttribute('data-variant-id');
      const recipientAmount = option.getAttribute('data-recipient-amount');
      window.recipientVariantId = recipientVariantId;

      const serviceVariantId = window.selectedServiceVariantId;
      const businessData = (window.businessInfoList && window.businessInfoList[0]) || window.businessInfo;

      if (!serviceVariantId || !recipientVariantId || !businessData) {
        console.error('Missing data to complete cart addition');
        return;
      }

      try {
        console.log('Service ID: ', serviceVariantId);
        console.log('Recipient ID: ', recipientVariantId);

        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            items: [{
              id: serviceVariantId,
              quantity: 1,
              properties: {
                ServiceType: window.selectedServiceType || '',
                _unique: Date.now()
              }
            },
            {
              id: recipientVariantId,
              quantity: 1,
              properties: {
                Units: recipientAmount,
                BusinessName: businessData.businessName,
                Street: businessData.street,
                City: businessData.city,
                State: businessData.state,
                ZIP: businessData.zipcode,
                ServiceType: window.selectedServiceType || '',
                PMCName: window.pmcInfo?.name || '',
                PMCStreet: window.pmcInfo?.street || '',
                PMCCity: window.pmcInfo?.city || '',
                PMCState: window.pmcInfo?.state || '',
                PMCZipcode: window.pmcInfo?.zipcode || '',
                _unique: Date.now()
              }
            }
            ]
          })
        });

        if (!response.ok) {
          throw new Error('Failed to add items to cart');
        }

        console.log('All items added to cart!');
        document.querySelector('.process-three').classList.add('hide');
        document.querySelector('.final-process').classList.remove('hide');
        document.querySelector('.progress-container .progress').style.width = '100%';
        document.querySelector('.process-header h1').textContent = 'Review';
        setActiveStep('process-icon-four');
        document.querySelector('.process-icon-three').classList.add('step--complete', 'step--inactive');
        // Fetch updated cart and re-render review
        const updatedCart = await fetch('/cart.js').then(res => res.json());
        // Parse addresses from cart items
        const cartAddresses = updatedCart.items.filter(item => item.properties && (item.properties.BusinessName || item.properties.Street || item.properties.City || item.properties.State || item.properties.ZIP)).map(item => ({
          businessName: item.properties.BusinessName || '',
          street: item.properties.Street || '',
          city: item.properties.City || '',
          state: item.properties.State || '',
          zipcode: item.properties.ZIP || ''
        }));
        window.businessInfoList = cartAddresses;
        renderFinalOverview();
      } catch (error) {
        console.error('Error adding items to cart:', error);
      }
    });
  });

  // Final review: Add Another Address logic
  const addAddressBtn = document.getElementById('add-address-btn');
  if (addAddressBtn) {
    addAddressBtn.addEventListener('click', function() {
      // Set flag to indicate we're adding another address
      window.addingAnotherAddress = true;
      document.querySelectorAll('.process').forEach(step => step.classList.add('hide'));
      document.querySelector('.process-one').classList.remove('hide');
      document.querySelector('.process-header h1').textContent = 'Property Management Process';
      // Reset progress bar
      const progress = document.querySelector('.progress-container .progress');
      if (progress) progress.style.width = '25%';
      // Set step bar to first step as active
      if (typeof setActiveStep === 'function') {
        setActiveStep('process-icon-one');
      }
    });
  }

  // Back button logic for all "Need To Edit? ← Back" links
  document.querySelectorAll('.selected--service-back-button').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();

      // Hide all process steps
      document.querySelectorAll('.process').forEach(step => {
        step.classList.add('hide');
      });

      // Show the first step (service selection)
      document.querySelector('.process-one').classList.remove('hide');

      // Reset step indicators
      document.querySelector('.process-icon-one').classList.remove('step--complete', 'step--inactive');
      document.querySelector('.process-header h1').textContent = 'Property Management Process';
      // If you have a progress bar, reset it here as well
      // const progress = document.querySelector('.progress-container .progress');
      // if (progress) progress.style.width = '25%';
    });
  });

  // Cancel Transaction Button: Clear cart on click
  document.querySelectorAll('.cancel-trans-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      fetch('/cart/clear.js', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
        .then(() => {
          // Optionally, refresh the page or redirect
          window.location.href = '/';
        });
    });
  });

});

// Edit Address Button
document.querySelector('.back-to-edit-address')?.addEventListener('click', (e) => {
  e.preventDefault();

  const form = document.getElementById('business-info');
  const info = window.businessInfo;
  if (!info) return;

  form.querySelector('[name="businessName"]').value = info.businessName;
  form.querySelector('[name="street"]').value = info.street;
  form.querySelector('[name="city"]').value = info.city;
  form.querySelector('[name="properties[State]"]').value = info.state;
  form.querySelector('[name="zipcode"]').value = info.zipcode;

  document.querySelector('.process-three')?.classList.add('hide');
  document.querySelector('.final-process')?.classList.add('hide');
  document.querySelector('.process-two')?.classList.remove('hide');
  document.querySelector('.process-header h1').textContent = 'Property Management Information';
});


// Lease step
document.addEventListener('DOMContentLoaded', () => {
  const leaseModal = document.querySelector('.lease-transaction-process');
  if (!leaseModal) return;

  const maxAddresses = 3;
  const addressContainer = document.getElementById('address-container');
  const addAddressBtn = document.getElementById('add-address-btn');

  addAddressBtn?.addEventListener('click', () => {
    const currentForms = addressContainer.querySelectorAll('.address-form');
    if (currentForms.length >= maxAddresses) return alert("You can only add up to 3 addresses.");
    const newForm = currentForms[0].cloneNode(true);
    newForm.querySelectorAll('input').forEach(input => input.value = '');
    newForm.querySelector('select').selectedIndex = 0;
    addressContainer.appendChild(newForm);
  });

  document.querySelectorAll('[data-lease-sales-btn]').forEach(btn => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      leaseModal.classList.add('show');
    });
  });

  leaseModal.querySelectorAll('.cancel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      leaseModal.classList.remove('show');
    });
  });

  leaseModal.querySelectorAll('.step-el').forEach(step => {
    step.addEventListener('click', () => {
      const variantId = step.getAttribute('data-variant-id');
      window.selectedServiceVariantId = variantId;
      fetch('/cart/clear.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
        .then(() => {
          leaseModal.querySelector('.process-one').classList.add('hide');
          leaseModal.querySelector('.process-two').classList.remove('hide');
          leaseModal.querySelector('.process-header h1').textContent = 'Enter Business Info';
          leaseModal.querySelector('.progress-container .progress').style.width = '50%';
        })
        .catch(err => console.error('Error clearing cart:', err));
    });
  });

  const businessForm = leaseModal.querySelector('#business-info');
  if (businessForm) {
    businessForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const allAddresses = [];
      addressContainer.querySelectorAll('.address-form').forEach(form => {
        allAddresses.push({
          businessName: form.querySelector('[name="businessName"]').value,
          street: form.querySelector('[name="street"]').value,
          city: form.querySelector('[name="city"]').value,
          state: form.querySelector('[name="state"]').value,
          zipcode: form.querySelector('[name="zipcode"]').value
        });
      });
      window.businessInfoList = allAddresses;
      leaseModal.querySelector('.process-two').classList.add('hide');
      leaseModal.querySelector('.process-three').classList.remove('hide');
      leaseModal.querySelector('.process-header h1').textContent = 'How Many Recipients?';
      leaseModal.querySelector('.progress-container .progress').style.width = '75%';
    });
  }
});

function renderFinalOverview() {
  const addresses = window.businessInfoList || [];
  let html = '';
  addresses.forEach((address, idx) => {
    html += `
      <table style="width:100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #000000; color: white;">
            <th colspan="2" style="padding: 8px; border: 1px solid #ccc; text-align:left; font-size:1.1em;">Property Address ${idx + 1}</th>
          </tr>
          <tr style="background: #eaeaea; color: #222;">
            <th style="padding: 8px; border: 1px solid #ccc; width: 180px;">Property Info</th>
            <th style="padding: 8px; border: 1px solid #ccc;">Property Detail</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding: 8px; border: 1px solid #ccc; background-color: #fafafa;">Property Name</td><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${address.businessName || ''}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ccc; background-color: #fafafa;">Street Address</td><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${address.street || ''}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ccc; background-color: #fafafa;">City</td><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${address.city || ''}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ccc; background-color: #fafafa;">State</td><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${address.state || ''}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ccc; background-color: #fafafa;">ZIP Code</td><td style="padding: 8px; border: 1px solid #ccc; font-weight: bold;">${address.zipcode || ''}</td></tr>
        </tbody>
      </table>
    `;
  });
  document.querySelector('.final-overview').innerHTML = html;
  renderPaymentBreakdown();
}

function renderPaymentBreakdown() {
  fetch('/cart.js')
    .then(res => res.json())
    .then(cart => {
      let paymentHTML = `<table style="width:100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="background: #000000; color: white;">
            <th style="padding: 8px; border: 1px solid #ccc;">Property / Service</th>
            <th style="padding: 8px; border: 1px solid #ccc;">Price</th>
            <th style="padding: 8px; border: 1px solid #ccc;">Total</th>
            <th style="padding: 8px; border: 1px solid #ccc;"></th>
          </tr>
        </thead>
        <tbody>`;
      cart.items.forEach(item => {
        const quantityLabel = item.quantity > 1 ? ` x${item.quantity}` : '';
        const hasPropertyInfo = item.properties && (item.properties.BusinessName || item.properties.Street || item.properties.City || item.properties.State || item.properties.ZIP);
        paymentHTML += `
          <tr>
            <td style="padding: 8px; border: 1px solid #ccc;">
              <strong>${item.title}${quantityLabel}</strong>
              ${(item.properties && (
                item.properties.BusinessName || item.properties.Street || item.properties.City || item.properties.State || item.properties.ZIP ||
                item.properties.PMCName || item.properties.PMCStreet || item.properties.PMCCity || item.properties.PMCState || item.properties.PMCZipcode
              )) ? `
                <div style='font-size:0.95em; color:#444; margin-top:4px;'>
                  ${item.properties.BusinessName ? `<div><strong>Property Name:</strong> ${item.properties.BusinessName}</div>` : ''}
                  ${item.properties.Street ? `<div><strong>Street:</strong> ${item.properties.Street}</div>` : ''}
                  ${item.properties.City ? `<div><strong>City:</strong> ${item.properties.City}</div>` : ''}
                  ${item.properties.State ? `<div><strong>State:</strong> ${item.properties.State}</div>` : ''}
                  ${item.properties.ZIP ? `<div><strong>ZIP:</strong> ${item.properties.ZIP}</div>` : ''}
                  ${item.properties.PMCName ? `<div><strong>PMC Name:</strong> ${item.properties.PMCName}</div>` : ''}
                  ${item.properties.PMCStreet ? `<div><strong>PMC Address:</strong> ${item.properties.PMCStreet}</div>` : ''}
                  ${item.properties.PMCCity ? `<div><strong>PMC City:</strong> ${item.properties.PMCCity}</div>` : ''}
                  ${item.properties.PMCState ? `<div><strong>PMC State:</strong> ${item.properties.PMCState}</div>` : ''}
                  ${item.properties.PMCZipcode ? `<div><strong>PMC ZIP:</strong> ${item.properties.PMCZipcode}</div>` : ''}
                </div>
              ` : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ccc; text-align:right;">$${(item.price/100).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ccc; text-align:right; font-weight:bold;">$${((item.price * item.quantity)/100).toFixed(2)}</td>
            <td style="padding: 8px; border: 1px solid #ccc; text-align:center;">
              ${hasPropertyInfo ? `<button class='remove-property-btn' data-line-item-key='${item.key}' data-service-type='${item.properties?.ServiceType || ''}' style='color:red; background:none; border:none; cursor:pointer; font-weight:bold;'>Remove Property</button>` : ''}
            </td>
          </tr>
        `;
      });
      paymentHTML += `
          <tr style="background: #eaeaea; font-weight:bold;">
            <td colspan="3" style="padding: 8px; border: 1px solid #ccc; text-align:right;">Total</td>
            <td style="padding: 8px; border: 1px solid #ccc; text-align:right;">$${(cart.total_price/100).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>`;
      document.querySelector('.Total').innerHTML = paymentHTML;

      // Add event listeners for remove buttons
      document.querySelectorAll('.remove-property-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const key = this.getAttribute('data-line-item-key');
          const serviceType = this.getAttribute('data-service-type');
          // Remove both the property and its associated service type from the cart
          fetch('/cart.js')
            .then(res => res.json())
            .then(cart => {
              const itemsToRemove = cart.items.filter(item =>
                item.key === key || (item.properties && item.properties.ServiceType === serviceType)
              );
              const updates = {};
              itemsToRemove.forEach(item => {
                updates[item.key] = 0;
              });
              fetch('/cart/update.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
              })
              .then(() => {
                // After update, check if cart is empty
                fetch('/cart.js')
                  .then(res => res.json())
                  .then(newCart => {
                    if (newCart.items.length === 0) {
                      document.querySelector('.final-process').classList.add('hide');
                      document.querySelector('.process-one').classList.remove('hide');
                      document.querySelector('.process-header h1').textContent = 'Property Management Process';
                      const progress = document.querySelector('.progress-container .progress');
                      if (progress) progress.style.width = '25%';
                      // Reset stepper header
                      document.querySelectorAll('.steps .step').forEach((step, idx) => {
                        step.classList.remove('step--active', 'step--complete', 'step--inactive');
                        if (idx === 0) {
                          step.classList.add('step--active');
                        }
                      });
                      if (typeof setActiveStep === 'function') {
                        setActiveStep('process-icon-one');
                      }
                    } else {
                      renderFinalOverview();
                    }
                  });
              });
            });
        });
      });
    });
}
