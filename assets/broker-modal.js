document.addEventListener('DOMContentLoaded', () => {
  console.log('Broker Modal Init')
  // Open Property Process Modal
  const propertyBtn = document.querySelector('[data-property-management-btn]');
  const closeProcessBtn = document.querySelector('.cancel-btn');

  // Track which step is being edited to avoid creating duplicates
  window.currentEditingStep = null;
  window.currentEditingAddressIndex = null;

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

  // Make setActiveStep available globally
  window.setActiveStep = setActiveStep;

  // Utility function to return to review screen
  function returnToReview() {
    document.querySelectorAll('.process').forEach(step => step.classList.add('hide'));
    document.querySelector('.final-process').classList.remove('hide');
    document.querySelector('.process-header h1').textContent = 'Review';
    document.querySelector('.progress-container .progress').style.width = '100%';
    window.setActiveStep('process-icon-three');
    renderFinalOverview();
  }

  // Function to determine unit range and pricing based on input value
  function getUnitRangeAndPricing(unitCount) {
    const units = [
      { range: '0-250', today: 0, monthly: 0, min: 0, max: 250 },
      { range: '251-300', today: 25, monthly: 50, min: 251, max: 300 },
      { range: '301-350', today: 37.5, monthly: 75, min: 301, max: 350 },
      { range: '351-400', today: 50, monthly: 100, min: 351, max: 400 },
      { range: '401-450', today: 62.5, monthly: 125, min: 401, max: 450 },
      { range: '451+', today: 75, monthly: 150, min: 451, max: Infinity },
    ];

    for (const unitRange of units) {
      if (unitCount >= unitRange.min && unitCount <= unitRange.max) {
        return unitRange;
      }
    }

    // Default to first range if no match
    return units[0];
  }

  // Function to get variant ID based on unit range
  function getVariantIdForRange(range) {
    // Get variant data from the hidden DOM elements
    const variantData = document.getElementById('variant-data');
    if (variantData) {
      const variantInfo = variantData.querySelector(`[data-range="${range}"]`);
      if (variantInfo) {
        return variantInfo.getAttribute('data-variant-id');
      }
    }

    // Fallback: try to find a close match
    const allVariants = variantData?.querySelectorAll('.variant-info');
    if (allVariants) {
      for (const variant of allVariants) {
        const variantRange = variant.getAttribute('data-range');
        if (variantRange === range) {
          return variant.getAttribute('data-variant-id');
        }
      }
    }

    console.warn('No variant found for range:', range);
    return null;
  }

  // Step 1: Service Selection
  const stepEls = document.querySelectorAll('.step-el');
  stepEls.forEach(step => {
    step.addEventListener('click', async () => {
      const variantId = step.getAttribute('data-variant-id');
      window.selectedServiceVariantId = variantId;
      window.selectedServiceType = step.querySelector('h2')?.textContent?.trim() || '';
      const selectedServiceHTML = step.innerHTML;

      // Check if we're editing from review step
      const isEditingFromReview = window.currentEditingStep === 'service';

      if (isEditingFromReview) {
        // Update all existing addresses in cart with new service type
        try {
          const cart = await fetch('/cart.js').then(res => res.json());
          console.log('Current cart before service update:', cart);

          // Find all address items that need service type updates
          const addressItems = cart.items.filter(item =>
            item.properties &&
            item.properties.Units &&
            item.properties.BusinessName &&
            item.properties.Street &&
            item.properties.City &&
            item.properties.State &&
            item.properties.ZIP
          );

          console.log('Address items to update:', addressItems);

          if (addressItems.length > 0) {
            // Remove all existing items and add them back with updated service type
            const removeUpdates = {};
            cart.items.forEach(item => {
              removeUpdates[item.key] = 0;
            });

            // Remove all items
            const removeResponse = await fetch('/cart/update.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ updates: removeUpdates })
            });

            if (!removeResponse.ok) {
              throw new Error('Failed to remove existing cart items');
            }

            console.log('All existing items removed successfully');

            // Add back all items with updated service type
            const newItems = [];
            addressItems.forEach(addressItem => {
              // Add service item
              newItems.push({
                id: variantId,
                quantity: 1,
                properties: {
                  ServiceType: window.selectedServiceType,
                  _unique: addressItem.properties._unique
                }
              });

              // Add address item with updated service type
              newItems.push({
                id: addressItem.variant_id,
                quantity: 1,
                properties: {
                  Units: addressItem.properties.Units,
                  BusinessName: addressItem.properties.BusinessName,
                  Street: addressItem.properties.Street,
                  City: addressItem.properties.City,
                  State: addressItem.properties.State,
                  ZIP: addressItem.properties.ZIP,
                  ServiceType: window.selectedServiceType,
                  PMCName: addressItem.properties.PMCName || '',
                  PMCStreet: addressItem.properties.PMCStreet || '',
                  PMCCity: addressItem.properties.PMCCity || '',
                  PMCState: addressItem.properties.PMCState || '',
                  PMCZipcode: addressItem.properties.PMCZipcode || '',
                  _unique: addressItem.properties._unique
                }
              });
            });

            const addResponse = await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: newItems })
            });

            if (!addResponse.ok) {
              throw new Error('Failed to add updated items to cart');
            }

            console.log('All items updated with new service type successfully');
          }

          // Clear editing state
          window.currentEditingStep = null;
          window.currentEditingAddressIndex = null;

          // Return to review screen
          returnToReview();
          return;
        } catch (error) {
          console.error('Error updating service type:', error);
          alert('Failed to update service type. Please try again.');
          return;
        }
      }

      // Clear editing state when starting fresh
      window.currentEditingStep = null;
      window.currentEditingAddressIndex = null;

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

    // Update existing PMC info or create new
    if (window.currentEditingStep === 'pmc') {
      // Update existing PMC info
      window.pmcInfo = {
        name: pmcForm.querySelector('[name="pmcName"]').value,
        street: pmcForm.querySelector('[name="pmcStreet"]').value,
        city: pmcForm.querySelector('[name="pmcCity"]').value,
        state: pmcForm.querySelector('[name="pmcState"]').value,
        zipcode: pmcForm.querySelector('[name="pmcZipcode"]').value
      };
      // Clear editing state
      window.currentEditingStep = null;

      // Return to review screen
      returnToReview();
      return;
    } else {
      // Create new PMC info
      window.pmcInfo = {
        name: pmcForm.querySelector('[name="pmcName"]').value,
        street: pmcForm.querySelector('[name="pmcStreet"]').value,
        city: pmcForm.querySelector('[name="pmcCity"]').value,
        state: pmcForm.querySelector('[name="pmcState"]').value,
        zipcode: pmcForm.querySelector('[name="pmcZipcode"]').value
      };
    }

    document.querySelector('.process-pmc').classList.add('hide');
    document.querySelector('.process-two').classList.remove('hide');
    document.querySelector('.process-header h1').textContent = 'Property Information & Unit Count';
    document.querySelector('.progress-container .progress').style.width = '75%';
    setActiveStep('process-icon-two');
    document.querySelector('.process-icon-pmc').classList.add('step--complete', 'step--inactive');
  });

  // Step 2: Business Info Form (single address, initial entry or add another) - Now includes units
  const businessForm = document.querySelector('.process-two .business-info');

  // Handle units input change to show pricing info
  // const unitsInput = document.getElementById('units-input');
  // const unitsInfo = document.querySelector('.units-info');
  // const selectedRangeSpan = document.getElementById('selected-range');
  // const todayChargeSpan = document.getElementById('today-charge');
  // const monthlyChargeSpan = document.getElementById('monthly-charge');

  // if (unitsInput && unitsInfo && selectedRangeSpan && todayChargeSpan && monthlyChargeSpan) {
  //   unitsInput.addEventListener('input', function() {
  //     const unitCount = parseInt(this.value);
  //     console.log('Units input changed:', unitCount);
  //     if (unitCount && unitCount > 0) {
  //       const unitRange = getUnitRangeAndPricing(unitCount);
  //       console.log('Unit range determined:', unitRange);
  //       selectedRangeSpan.textContent = unitRange.range;
  //       todayChargeSpan.textContent = `$${unitRange.today.toFixed(2)}`;
  //       monthlyChargeSpan.textContent = `$${unitRange.monthly.toFixed(2)}`;
  //       unitsInfo.style.display = 'block';
  //     } else {
  //       unitsInfo.style.display = 'none';
  //     }
  //   });
  // }

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

    // Get units from the combined form
    const unitCount = parseInt(form.querySelector('[name="units"]').value);
    if (!unitCount || unitCount <= 0) {
      alert('Please enter a valid number of units');
      return;
    }

    if (unitCount > 1000) {
      alert('Please enter a number of units between 1 and 1000');
      return;
    }

    // Get unit range and pricing
    const unitRange = getUnitRangeAndPricing(unitCount);
    const recipientVariantId = getVariantIdForRange(unitRange.range);
    const recipientAmount = unitRange.range;

    if (!recipientVariantId) {
      alert('Unable to find product variant for the selected unit range. Please try again or contact support.');
      return;
    }

    window.recipientVariantId = recipientVariantId;

    if (window.addingAnotherAddress) {
      // Adding a new address - process and add to cart immediately
      if (!window.businessInfoList) window.businessInfoList = [];
      window.businessInfoList.push(businessInfo);
      window.addingAnotherAddress = false;
      window.currentEditingStep = null;
      window.currentEditingAddressIndex = null;

      // Process the new address immediately
      processAddressToCart(businessInfo, unitRange, recipientVariantId, recipientAmount);
      return;
    } else if (window.currentEditingStep === 'address' && window.currentEditingAddressIndex !== null) {
      // Updating existing address
      if (!window.businessInfoList) window.businessInfoList = [];
      window.businessInfoList[window.currentEditingAddressIndex] = businessInfo;

      // Update the cart with the new address information
      fetch('/cart.js')
        .then(res => res.json())
        .then(async cart => {
          // Find the address item to update
          const addressItem = cart.items.find(item =>
            item.properties &&
            item.properties.Units &&
            item.properties.BusinessName &&
            item.properties.Street &&
            item.properties.City &&
            item.properties.State &&
            item.properties.ZIP
          );

          if (addressItem) {
            // Remove the old address item
            const removeUpdates = {};
            removeUpdates[addressItem.key] = 0;

            // Also remove the associated service item
            const serviceItem = cart.items.find(item =>
              item.properties &&
              !item.properties.Units &&
              item.properties.ServiceType &&
              item.properties._unique === addressItem.properties._unique
            );

            if (serviceItem) {
              removeUpdates[serviceItem.key] = 0;
            }

            // Remove old items
            await fetch('/cart/update.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ updates: removeUpdates })
            });

            // Add updated items
            const newItems = [];

            // Add service item
            if (serviceItem) {
              newItems.push({
                id: serviceItem.variant_id,
                quantity: 1,
                properties: {
                  ServiceType: serviceItem.properties.ServiceType,
                  _unique: Date.now()
                }
              });
            }

            // Add updated address item
            newItems.push({
              id: addressItem.variant_id,
              quantity: 1,
              properties: {
                Units: addressItem.properties.Units,
                BusinessName: businessInfo.businessName,
                Street: businessInfo.street,
                City: businessInfo.city,
                State: businessInfo.state,
                ZIP: businessInfo.zipcode,
                ServiceType: serviceItem ? serviceItem.properties.ServiceType : '',
                PMCName: addressItem.properties.PMCName || '',
                PMCStreet: addressItem.properties.PMCStreet || '',
                PMCCity: addressItem.properties.PMCCity || '',
                PMCState: addressItem.properties.PMCState || '',
                PMCZipcode: addressItem.properties.PMCZipcode || '',
                _unique: Date.now()
              }
            });

            await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: newItems })
            });
          }

          // Clear editing state
          window.currentEditingStep = null;
          window.currentEditingAddressIndex = null;

          // Return to review screen
          returnToReview();
        })
        .catch(error => {
          console.error('Error updating address in cart:', error);
          alert('Failed to update address. Please try again.');
        });

      return;
    } else {
      // Creating first address - process and add to cart immediately
      window.businessInfoList = [businessInfo];

      // Process the first address immediately
      processAddressToCart(businessInfo, unitRange, recipientVariantId, recipientAmount);
      return;
    }
  });

  // Helper function to process address to cart
  async function processAddressToCart(businessInfo, unitRange, recipientVariantId, recipientAmount) {
    const serviceVariantId = window.selectedServiceVariantId;
    const finalServiceType = window.selectedServiceType;

    if (!serviceVariantId || !recipientVariantId || !businessInfo) {
      console.error('Missing data to complete cart addition');
      console.error('ServiceVariantId:', serviceVariantId);
      console.error('RecipientVariantId:', recipientVariantId);
      console.error('BusinessInfo:', businessInfo);
      return;
    }

    try {
      console.log('Service ID: ', serviceVariantId);
      console.log('Recipient ID: ', recipientVariantId);

      // Adding new items to cart
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
              ServiceType: finalServiceType || '',
              _unique: Date.now()
            }
          },
          {
            id: recipientVariantId,
            quantity: 1,
            properties: {
              Units: recipientAmount,
              BusinessName: businessInfo.businessName,
              Street: businessInfo.street,
              City: businessInfo.city,
              State: businessInfo.state,
              ZIP: businessInfo.zipcode,
              ServiceType: finalServiceType || '',
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

      console.log('All items processed!');
      document.querySelector('.process-two').classList.add('hide');
      document.querySelector('.final-process').classList.remove('hide');
      document.querySelector('.progress-container .progress').style.width = '100%';
      document.querySelector('.process-header h1').textContent = 'Review';
      setActiveStep('process-icon-three');
      document.querySelector('.process-icon-two').classList.add('step--complete', 'step--inactive');

      // Clear editing state
      window.currentEditingStep = null;
      window.currentEditingAddressIndex = null;

      // Fetch updated cart and re-render review
      const updatedCart = await fetch('/cart.js').then(res => res.json());
      console.log('Updated cart after processing:', updatedCart);
      // Parse addresses from cart items
      const cartAddresses = updatedCart.items.filter(item => item.properties && (item.properties.BusinessName || item.properties.Street || item.properties.City || item.properties.State || item.properties.ZIP)).map(item => ({
        businessName: item.properties.BusinessName || '',
        street: item.properties.Street || '',
        city: item.properties.City || '',
        state: item.properties.State || '',
        zipcode: item.properties.ZIP || ''
      }));
      console.log('Parsed cart addresses:', cartAddresses);
      window.businessInfoList = cartAddresses;
      renderFinalOverview();
    } catch (error) {
      console.error('Error processing cart items:', error);
    }
  }

  // Final review: Add Another Address logic
  const addAddressBtn = document.getElementById('add-address-btn');
  if (addAddressBtn) {
    addAddressBtn.addEventListener('click', function() {
      // Set flag to indicate we're adding another address
      window.addingAnotherAddress = true;
      window.currentEditingStep = null;
      window.currentEditingAddressIndex = null;
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

      // Clear editing state when going back to start
      window.currentEditingStep = null;
      window.currentEditingAddressIndex = null;

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

  // Stepper navigation logic: allow clicking on completed/active steps to revisit steps and retain data
  const stepToProcessMap = {
    'process-icon-one': {
      process: '.process-one',
      header: 'Property Management Process',
      progress: '25%',
      restore: () => {
        // No form to restore for step 1
        window.currentEditingStep = null;
        window.currentEditingAddressIndex = null;
      }
    },
    'process-icon-pmc': {
      process: '.process-pmc',
      header: 'Property Management Company',
      progress: '33%',
      restore: () => {
        // Restore PMC form fields and set editing state
        if (window.pmcInfo) {
          const pmcForm = document.querySelector('.process-pmc .pmc-info');
          if (pmcForm) {
            pmcForm.querySelector('[name="pmcName"]').value = window.pmcInfo.name || '';
            pmcForm.querySelector('[name="pmcStreet"]').value = window.pmcInfo.street || '';
            pmcForm.querySelector('[name="pmcCity"]').value = window.pmcInfo.city || '';
            pmcForm.querySelector('[name="pmcState"]').value = window.pmcInfo.state || '';
            pmcForm.querySelector('[name="pmcZipcode"]').value = window.pmcInfo.zipcode || '';
          }
        }
        window.currentEditingStep = 'pmc';
        window.currentEditingAddressIndex = null;
      }
    },
    'process-icon-two': {
      process: '.process-two',
      header: 'Property Information & Unit Count',
      progress: '75%',
      restore: () => {
        // Restore business info form fields for the specific address being edited
        if (window.businessInfoList && window.currentEditingAddressIndex !== null) {
          const info = window.businessInfoList[window.currentEditingAddressIndex];
          const businessForm = document.querySelector('.process-two .business-info');
          if (businessForm && info) {
            businessForm.querySelector('[name="businessName"]').value = info.businessName || '';
            businessForm.querySelector('[name="street"]').value = info.street || '';
            businessForm.querySelector('[name="city"]').value = info.city || '';
            businessForm.querySelector('[name="state"]').value = info.state || '';
            businessForm.querySelector('[name="zipcode"]').value = info.zipcode || '';
          }
        } else if (window.businessInfoList && window.businessInfoList[0]) {
          // Fallback to first address if no specific index
          const info = window.businessInfoList[0];
          const businessForm = document.querySelector('.process-two .business-info');
          if (businessForm) {
            businessForm.querySelector('[name="businessName"]').value = info.businessName || '';
            businessForm.querySelector('[name="street"]').value = info.street || '';
            businessForm.querySelector('[name="city"]').value = info.city || '';
            businessForm.querySelector('[name="state"]').value = info.state || '';
            businessForm.querySelector('[name="zipcode"]').value = info.zipcode || '';
          }
        }

        // Restore units value if editing
        if (window.currentEditingAddressIndex !== null && window.businessInfoList) {
          fetch('/cart.js')
            .then(res => res.json())
            .then(cart => {
              const addressInfo = window.businessInfoList[window.currentEditingAddressIndex];
              if (addressInfo) {
                const addressItem = cart.items.find(item =>
                  item.properties &&
                  item.properties.BusinessName === addressInfo.businessName &&
                  item.properties.Street === addressInfo.street &&
                  item.properties.City === addressInfo.city &&
                  item.properties.State === addressInfo.state &&
                  item.properties.ZIP === addressInfo.zipcode &&
                  item.properties.Units
                );

                if (addressItem && addressItem.properties.Units) {
                  const unitsInput = document.getElementById('units-input');
                  if (unitsInput) {
                    // Extract the number from the range (e.g., "251-300" -> 251)
                    const range = addressItem.properties.Units;
                    const unitNumber = parseInt(range.split('-')[0]);
                    if (!isNaN(unitNumber)) {
                      unitsInput.value = unitNumber;
                      // Trigger the input event to show pricing info
                      unitsInput.dispatchEvent(new Event('input'));
                    }
                  }
                }
              }
            })
            .catch(error => {
              console.error('Error restoring units value:', error);
            });
        }

        window.currentEditingStep = 'address';
        if (window.currentEditingAddressIndex === null) {
          window.currentEditingAddressIndex = 0;
        }
      }
    },
    'process-icon-three': {
      process: '.final-process',
      header: 'Review',
      progress: '100%',
      restore: () => {
        renderFinalOverview();
        window.currentEditingStep = null;
        window.currentEditingAddressIndex = null;
      }
    }
  };


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
  const pmc = window.pmcInfo || {};

  // Mock data for demonstration (replace with real data as needed)
  const numberOfStates = 2;
  const activationFee = 1750.00;
  const proratedMonthlyFee = 500.00;
  const monthlyDue = 0.00;
  const serviceType = 'Broker Oversight';
  const googleReview = '3 or less stars';
  const googleReviewColor = 'color:#e00; font-weight:bold;';
  const units = [
    { range: '0-250', today: 0, monthly: 0 },
    { range: '251-300', today: 25, monthly: 50 },
    { range: '301-350', today: 37.5, monthly: 75 },
    { range: '351-400', today: 50, monthly: 100 },
    { range: '401-450', today: 62.5, monthly: 125 },
    { range: '451+', today: 75, monthly: 150 },
  ];

  // Start with a placeholder for the service type charge
  let serviceTypeCharge = '...';

  let html = `
    <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
      <tr>
        <th colspan="6" style="background:#0033cc; color:white; padding:8px; font-size:1.1em; text-align:left;">
          Property Management Company
        </th>
      </tr>
      <tr style="background:#f5f5f5;">
        <th>Company Name</th>
        <th>Street</th>
        <th>City</th>
        <th>State</th>
        <th>ZIP</th>
        <th>Action</th>
      </tr>
      <tr>
        <td style="color:#0074d9; font-weight:bold;">${pmc.name || 'ABC Property Management, Inc.'}</td>
        <td>${pmc.street || '123 Main Street'}</td>
        <td>${pmc.city || 'Atlanta'}</td>
        <td>${pmc.state || 'GA'}</td>
        <td>${pmc.zipcode || '30309'}</td>
        <td style="text-align:center;">
          <button class="edit-pmc-btn" style="color:blue; background:none; border:none; cursor:pointer; font-weight:bold;">Edit PMC</button>
        </td>
      </tr>
    </table>
  `;

  document.querySelector('.pmc-overview').innerHTML = html;

  // Add Edit PMC button listener
  document.querySelector('.edit-pmc-btn')?.addEventListener('click', function() {
    window.currentEditingStep = 'pmc';
    window.currentEditingAddressIndex = null;

    // Hide all process steps
    document.querySelectorAll('.process').forEach(step => step.classList.add('hide'));
    // Show the PMC form
    document.querySelector('.process-pmc').classList.remove('hide');
    document.querySelector('.process-header h1').textContent = 'Property Management Company';
    document.querySelector('.progress-container .progress').style.width = '33%';
    window.setActiveStep('process-icon-pmc');

    // Restore PMC form fields
    if (window.pmcInfo) {
      const pmcForm = document.querySelector('.process-pmc .pmc-info');
      if (pmcForm) {
        pmcForm.querySelector('[name="pmcName"]').value = window.pmcInfo.name || '';
        pmcForm.querySelector('[name="pmcStreet"]').value = window.pmcInfo.street || '';
        pmcForm.querySelector('[name="pmcCity"]').value = window.pmcInfo.city || '';
        pmcForm.querySelector('[name="pmcState"]').value = window.pmcInfo.state || '';
        pmcForm.querySelector('[name="pmcZipcode"]').value = window.pmcInfo.zipcode || '';
      }
    }
  });

  // Fetch cart to get line item prices for each address
  fetch('/cart.js')
    .then(res => res.json())
    .then(cart => {
      console.log('Cart data in renderFinalOverview:', cart);

      // Parse addresses from cart items instead of using window.businessInfoList
      const cartAddresses = cart.items.filter(item =>
        item.properties &&
        item.properties.Units &&
        item.properties.BusinessName &&
        item.properties.Street &&
        item.properties.City &&
        item.properties.State &&
        item.properties.ZIP
      ).map(item => ({
        businessName: item.properties.BusinessName,
        street: item.properties.Street,
        city: item.properties.City,
        state: item.properties.State,
        zipcode: item.properties.ZIP
      }));

      console.log('Addresses from cart:', cartAddresses);

      // Update window.businessInfoList with cart addresses for consistency
      window.businessInfoList = cartAddresses;

      let overallTotal = 0;
      let addressHtml = '';
      // if (cartAddresses.length > 0) {
      //   addressHtml += `
      //     <div style="margin-bottom: 12px; font-size: 1.1em;">
      //       <strong>Property Overview</strong>
      //     </div>
      //   `;
      // }
      cartAddresses.forEach((address, idx) => {
        console.log('Processing address:', address);
        // Find the address and service type cart items for this address by shared _unique property
        const addressItem = cart.items.find(item =>
          item.properties &&
          item.properties.BusinessName === address.businessName &&
          item.properties.Street === address.street &&
          item.properties.City === address.city &&
          item.properties.State === address.state &&
          item.properties.ZIP === address.zipcode &&
          item.properties.Units
        );
        console.log('Found address item:', addressItem);
        // Use the _unique property to match both items
        const uniqueId = addressItem && addressItem.properties._unique;
        const serviceTypeItem = cart.items.find(item =>
          item.properties &&
          item.properties._unique === uniqueId &&
          !item.properties.Units // ServiceType item does not have Units
        );
        console.log('Found service item:', serviceTypeItem);
        const addressPrice = addressItem ? addressItem.price : 0;
        const serviceTypePrice = serviceTypeItem ? serviceTypeItem.price : 0;
        const todayCharge = (addressPrice + serviceTypePrice) / 100;
        overallTotal += todayCharge;
        const addressServiceType = serviceTypeItem ? serviceTypeItem.properties.ServiceType : (address.serviceType || serviceType);
        console.log('Units for address:', addressItem && addressItem.properties.Units);

        // Skip rendering if no uniqueId is found (address not in cart)
        if (!uniqueId) {
          console.warn('No uniqueId found for address:', address);
          return;
        }

        addressHtml += `
          <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
            <tr>
              <th colspan="8" style="background:#0033cc; color:white; padding:8px; font-size:1.1em; text-align:left;">
                ${address.street || '123 Main Street'}, ${address.city || 'Atlanta'}, ${address.state || 'GA'} ${address.zipcode || '30309'}
              </th>
            </tr>
            <tr style="background:#f5f5f5;">
              <th>Service Type</th>
              <th>Building Name</th>
              <th>Property Address</th>
              <th>Units</th>
              <th>Today's Charges</th>
              <th>Address Action</th>
            </tr>
            <tr>
              <td>
                <select class="service-type-dropdown" data-unique="${uniqueId}" data-address-index="${idx}" style="padding:4px; border:1px solid #ccc; border-radius:3px; font-weight:bold; color:#e00;">
                  <option value="44005175853238" ${addressServiceType === 'Broker Oversight' ? 'selected' : ''}>Broker Oversight</option>
                  <option value="44005175886006" ${addressServiceType === 'Registered Company' ? 'selected' : ''}>Registered Company</option>
                </select>
              </td>
              <td>${address.businessName || 'ABC Apartments'}</td>
              <td style="color:#0074d9;">${address.street || '123 Main Street'}, ${address.city || 'Atlanta'}, ${address.state || 'GA'} ${address.zipcode || '30309'}</td>
              <td>${addressItem && addressItem.properties.Units ? addressItem.properties.Units : units[0].range}</td>
              <td style="color:#e00; font-weight:bold;">$${todayCharge.toFixed(2)}</td>
              <td class="address-actions" style="text-align:center;">
                <button class="edit-address-btn" data-address-index="${idx}" style="color:blue; background:none; border:none; cursor:pointer; font-weight:bold; margin-right:8px;">Edit Address</button>
                <button class="edit-units-btn" data-address-index="${idx}" style="color:blue; background:none; border:none; cursor:pointer; font-weight:bold; margin-right:8px;">Edit Units</button>
                <button class="remove-address-btn" data-unique="${uniqueId}" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;"><?xml version="1.0" encoding="utf-8"?>
<svg version="1.0" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 826 1144.5" style="enable-background:new 0 0 826 1144.5;" xml:space="preserve">
<g transform="translate(0.000000,1142.000000) scale(0.100000,-0.100000)">
	<path d="M2730,10645v-625H1470H210V8955V7890h258h257l148-3887c81-2139,148-3894,148-3900c-1-10,626-13,3104-13
		c2476,0,3106,3,3109,13s298,7755,296,7780c0,4,117,7,260,7h260v1065v1065H6790H5530v625v625H4130H2730V10645z M4790,10280v-250
		h-660h-660v250v250h660h660V10280z M7310,8960v-330H4130H950v330v330h3180h3180V8960z M6790,7749c0-37-137-3667-225-5954
		c-19-500-35-924-35-942v-33H4130H1730v30c0,17-49,1318-110,2893c-60,1574-120,3129-133,3455l-22,592h2662h2663V7749z"/>
	<path d="M2730,4305V1700h370h370v2605v2605h-370h-370V4305z"/>
	<path d="M4790,4270V1640h370h370v2630v2630h-370h-370V4270z"/>
</g>
</svg>Remove Property</button>
              </td>
            </tr>
          </table>
        `;
      });
      // Add overall total due at the bottom
      if (cartAddresses.length > 0) {
        addressHtml += `
          <div style="margin-top: 24px; font-size: 1.2em; text-align: right;">
            <strong style="color:#0033cc;">Overall Total Due: $${overallTotal.toFixed(2)}</strong>
          </div>
        `;
      }
      document.querySelector('.address-overview').innerHTML = addressHtml;

      // Attach remove button listeners
      document.querySelectorAll('.remove-address-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const uniqueId = this.getAttribute('data-unique');
          if (!uniqueId || uniqueId === '') {
            console.error('No uniqueId found for remove button');
            return;
          }

          console.log('remove btn clicked, uniqueId:', uniqueId);
          // Remove all cart items with this _unique value
          fetch('/cart.js')
            .then(res => res.json())
            .then(cart => {
              console.log('Current cart items:', cart.items);
              const updates = {};
              let foundItems = false;

              cart.items.forEach(item => {
                console.log('Checking item:', item.key, 'with _unique:', item.properties?._unique);
                if (item.properties && item.properties._unique && item.properties._unique.toString() === uniqueId.toString()) {
                  updates[item.key] = 0;
                  foundItems = true;
                  console.log('Marking item for removal:', item.key);
                }
              });

              if (!foundItems) {
                console.error('No items found with uniqueId:', uniqueId);
                return;
              }

              console.log('Items to remove:', updates);

              fetch('/cart/update.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates })
              })
              .then(response => {
                if (!response.ok) {
                  throw new Error('Failed to update cart');
                }
                console.log('Cart update successful');
                // After update, check if cart is empty
                return fetch('/cart.js');
              })
              .then(res => res.json())
              .then(newCart => {
                console.log('Updated cart:', newCart);

                // Parse addresses from updated cart items
                const cartAddresses = newCart.items.filter(item =>
                  item.properties &&
                  (item.properties.BusinessName || item.properties.Street || item.properties.City || item.properties.State || item.properties.ZIP)
                ).map(item => ({
                  businessName: item.properties.BusinessName || '',
                  street: item.properties.Street || '',
                  city: item.properties.City || '',
                  state: item.properties.State || '',
                  zipcode: item.properties.ZIP || ''
                }));

                console.log('Remaining addresses after removal:', cartAddresses);

                if (cartAddresses.length === 0) {
                  // Reset to step one when all addresses are removed
                  document.querySelectorAll('.process').forEach(step => step.classList.add('hide'));
                  document.querySelector('.process-one').classList.remove('hide');
                  document.querySelector('.process-header h1').textContent = 'Property Management Process';
                  document.querySelector('.progress-container .progress').style.width = '25%';

                  // Reset step indicators
                  document.querySelectorAll('.steps .step').forEach((step, idx) => {
                    step.classList.remove('step--active', 'step--complete', 'step--inactive');
                    if (idx === 0) {
                      step.classList.add('step--active');
                    }
                  });

                  // Clear any stored data
                  window.businessInfoList = [];
                  window.pmcInfo = null;
                  window.selectedServiceVariantId = null;
                  window.selectedServiceType = '';
                  window.currentEditingStep = null;
                  window.currentEditingAddressIndex = null;
                  window.addingAnotherAddress = false;

                  // Hide selected service wrapper
                  document.querySelector('.selected-service-wrapper')?.classList.add('hide');

                  // Remove modal overlay
                  document.querySelector('.property-process')?.classList.remove('show');
                  document.body.classList.remove('no-scroll');
                } else {
                  // Update the businessInfoList with remaining addresses
                  window.businessInfoList = cartAddresses;
                  renderFinalOverview();
                }
              })
              .catch(error => {
                console.error('Error updating cart:', error);
              });
            });
        });
      });

      // Attach edit button listeners
      document.querySelectorAll('.edit-address-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const addressIndex = this.getAttribute('data-address-index');
          window.currentEditingStep = 'address';
          window.currentEditingAddressIndex = parseInt(addressIndex);

          // Hide all process steps
          document.querySelectorAll('.process').forEach(step => step.classList.add('hide'));
          // Show the combined form
          document.querySelector('.process-two').classList.remove('hide');
          document.querySelector('.process-header h1').textContent = 'Property Information & Unit Count';
          document.querySelector('.progress-container .progress').style.width = '75%';
          window.setActiveStep('process-icon-two');

          // Show selected service in process-two
          const selectedServiceHTML = document.querySelector('.selected-service').innerHTML;
          const processTwoServiceWrapper = document.querySelector('.process-two .selected-service-wrapper');
          if (processTwoServiceWrapper) {
            processTwoServiceWrapper.classList.remove('hide');
            processTwoServiceWrapper.querySelector('.selected-service').innerHTML = selectedServiceHTML;
          }

          // Restore business info form fields
          if (window.businessInfoList && window.businessInfoList[window.currentEditingAddressIndex]) {
            const info = window.businessInfoList[window.currentEditingAddressIndex];
            const businessForm = document.querySelector('.process-two .business-info');
            if (businessForm) {
              businessForm.querySelector('[name="businessName"]').value = info.businessName || '';
              businessForm.querySelector('[name="street"]').value = info.street || '';
              businessForm.querySelector('[name="city"]').value = info.city || '';
              businessForm.querySelector('[name="state"]').value = info.state || '';
              businessForm.querySelector('[name="zipcode"]').value = info.zipcode || '';
            }
          }
        });
      });

      // Attach edit units button listeners - now redirects to combined form
      document.querySelectorAll('.edit-units-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const addressIndex = this.getAttribute('data-address-index');
          window.currentEditingStep = 'address';
          window.currentEditingAddressIndex = parseInt(addressIndex);

          // Hide all process steps
          document.querySelectorAll('.process').forEach(step => step.classList.add('hide'));
          // Show the combined form
          document.querySelector('.process-two').classList.remove('hide');
          document.querySelector('.process-header h1').textContent = 'Property Information & Unit Count';
          document.querySelector('.progress-container .progress').style.width = '75%';
          window.setActiveStep('process-icon-two');

          // Show selected service in process-two
          const selectedServiceHTML = document.querySelector('.selected-service').innerHTML;
          const processTwoServiceWrapper = document.querySelector('.process-two .selected-service-wrapper');
          if (processTwoServiceWrapper) {
            processTwoServiceWrapper.classList.remove('hide');
            processTwoServiceWrapper.querySelector('.selected-service').innerHTML = selectedServiceHTML;
          }
        });
      });


      // Attach service type dropdown change listeners
      document.querySelectorAll('.service-type-dropdown').forEach(dropdown => {
        dropdown.addEventListener('change', async function() {
          const uniqueId = this.getAttribute('data-unique');
          const newVariantId = this.value;
          const addressIndex = parseInt(this.getAttribute('data-address-index'));

          // Map variant ID to service type name
          const variantToServiceType = {
            '44005175853238': 'Broker Oversight',
            '44005175886006': 'Registered Company'
          };
          const newServiceType = variantToServiceType[newVariantId];

          console.log('User selected:', newServiceType, 'variant ID:', newVariantId, 'for uniqueId:', uniqueId);

          try {
            // Get current cart
            const cart = await fetch('/cart.js').then(res => res.json());
            console.log('Current cart items:', cart.items);

            // Find the current service type item in the cart
            const currentServiceItem = cart.items.find(item =>
              item.properties &&
              item.properties._unique &&
              item.properties._unique.toString() === uniqueId.toString() &&
              item.properties.ServiceType &&
              !item.properties.Units
            );

            if (!currentServiceItem) {
              console.error('Current service item not found for uniqueId:', uniqueId);
              return;
            }

            console.log('Found current service item:', currentServiceItem);
            console.log('Current service type:', currentServiceItem.properties.ServiceType);
            console.log('Replacing with:', newServiceType);

            // Remove the current service item
            const removeUpdates = {};
            removeUpdates[currentServiceItem.key] = 0;

            const removeResponse = await fetch('/cart/update.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ updates: removeUpdates })
            });

            if (!removeResponse.ok) {
              throw new Error('Failed to remove current service item');
            }

            // Add the new service item with selected variant
            const addResponse = await fetch('/cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: [{
                  id: newVariantId,
                  quantity: 1,
                  properties: {
                    ServiceType: newServiceType,
                    _unique: uniqueId
                  }
                }]
              })
            });

            if (!addResponse.ok) {
              throw new Error('Failed to add new service item');
            }

            console.log(`Service type updated successfully: ${currentServiceItem.properties.ServiceType} → ${newServiceType}`);

            // Re-render the overview to show updated pricing
            renderFinalOverview();

          } catch (error) {
            console.error('Error updating service type:', error);
            alert('Failed to update service type. Please try again.');
            // Revert the dropdown selection - get current value from cart
            fetch('/cart.js')
              .then(res => res.json())
              .then(cart => {
                const currentServiceItem = cart.items.find(item =>
                  item.properties &&
                  item.properties._unique &&
                  item.properties._unique.toString() === uniqueId.toString() &&
                  item.properties.ServiceType &&
                  !item.properties.Units
                );
                if (currentServiceItem) {
                  // Map service type back to variant ID
                  const serviceTypeToVariant = {
                    'Broker Oversight': '44005175853238',
                    'Registered Company': '44005175886006'
                  };
                  const currentVariantId = serviceTypeToVariant[currentServiceItem.properties.ServiceType];
                  if (currentVariantId) {
                    this.value = currentVariantId;
                  }
                }
              })
              .catch(err => console.error('Error reverting dropdown:', err));
          }
        });
      });
  });

  // Re-attach button actions
  // Cancel Transaction Button: Clear cart on click
  document.querySelector('.cancel-trans-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    fetch('/cart/clear.js', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(() => {
        // Optionally, refresh the page or redirect
        document.querySelector('.property-process')?.classList.remove('show');
        document.body.classList.remove('no-scroll');
        window.location.href = '/';
      });
  });

  // Add Another Address Button
  document.getElementById('add-address-btn')?.addEventListener('click', function() {
    window.addingAnotherAddress = true;
    window.currentEditingStep = null;
    window.currentEditingAddressIndex = null;
    document.querySelectorAll('.process').forEach(step => step.classList.add('hide'));
    document.querySelector('.process-one').classList.remove('hide');
    document.querySelector('.process-header h1').textContent = 'Property Management Process';
    // Reset progress bar
    const progress = document.querySelector('.progress-container .progress');
    if (progress) progress.style.width = '25%';
    // Set step bar to first step as active
    if (typeof window.setActiveStep === 'function') {
      window.setActiveStep('process-icon-one');
    }
  });

  // Checkout Button
  document.querySelector('.checkout-btn')?.addEventListener('click', function() {
    window.location.href = '/checkout';
  });

  // renderPaymentBreakdown();
}

// function renderPaymentBreakdown() {
//   fetch('/cart.js')
//     .then(res => res.json())
//     .then(cart => {
//       let paymentHTML = `<table style="width:100%; border-collapse: collapse; margin-top: 20px;">
//         <thead>
//           <tr style="background: #000000; color: white;">
//             <th style="padding: 8px; border: 1px solid #ccc;">Property / Service</th>
//             <th style="padding: 8px; border: 1px solid #ccc;">Price</th>
//             <th style="padding: 8px; border: 1px solid #ccc;">Total</th>
//             <th style="padding: 8px; border: 1px solid #ccc;"></th>
//           </tr>
//         </thead>
//         <tbody>`;
//       cart.items.forEach(item => {
//         const quantityLabel = item.quantity > 1 ? ` x${item.quantity}` : '';
//         const hasPropertyInfo = item.properties && (item.properties.BusinessName || item.properties.Street || item.properties.City || item.properties.State || item.properties.ZIP);
//         paymentHTML += `
//           <tr>
//             <td style="padding: 8px; border: 1px solid #ccc;">
//               <strong>${item.title}${quantityLabel}</strong>
//               ${(item.properties && (
//                 item.properties.BusinessName || item.properties.Street || item.properties.City || item.properties.State || item.properties.ZIP ||
//                 item.properties.PMCName || item.properties.PMCStreet || item.properties.PMCCity || item.properties.PMCState || item.properties.PMCZipcode
//               )) ? `
//                 <div style='font-size:0.95em; color:#444; margin-top:4px;'>
//                   ${item.properties.BusinessName ? `<div><strong>Property Name:</strong> ${item.properties.BusinessName}</div>` : ''}
//                   ${item.properties.Street ? `<div><strong>Street:</strong> ${item.properties.Street}</div>` : ''}
//                   ${item.properties.City ? `<div><strong>City:</strong> ${item.properties.City}</div>` : ''}
//                   ${item.properties.State ? `<div><strong>State:</strong> ${item.properties.State}</div>` : ''}
//                   ${item.properties.ZIP ? `<div><strong>ZIP:</strong> ${item.properties.ZIP}</div>` : ''}
//                   ${item.properties.PMCName ? `<div><strong>PMC Name:</strong> ${item.properties.PMCName}</div>` : ''}
//                   ${item.properties.PMCStreet ? `<div><strong>PMC Address:</strong> ${item.properties.PMCStreet}</div>` : ''}
//                   ${item.properties.PMCCity ? `<div><strong>PMC City:</strong> ${item.properties.PMCCity}</div>` : ''}
//                   ${item.properties.PMCState ? `<div><strong>PMC State:</strong> ${item.properties.PMCState}</div>` : ''}
//                   ${item.properties.PMCZipcode ? `<div><strong>PMC ZIP:</strong> ${item.properties.PMCZipcode}</div>` : ''}
//                 </div>
//               ` : ''}
//             </td>
//             <td style="padding: 8px; border: 1px solid #ccc; text-align:right;">$${(item.price/100).toFixed(2)}</td>
//             <td style="padding: 8px; border: 1px solid #ccc; text-align:right; font-weight:bold;">$${((item.price * item.quantity)/100).toFixed(2)}</td>
//             <td style="padding: 8px; border: 1px solid #ccc; text-align:center;">
//               ${hasPropertyInfo ? `<button class='remove-property-btn' data-line-item-key='${item.key}' data-service-type='${item.properties?.ServiceType || ''}' style='color:red; background:none; border:none; cursor:pointer; font-weight:bold;'>Remove Property</button>` : ''}
//             </td>
//           </tr>
//         `;
//       });
//       paymentHTML += `
//           <tr style="background: #eaeaea; font-weight:bold;">
//             <td colspan="3" style="padding: 8px; border: 1px solid #ccc; text-align:right;">Total</td>
//             <td style="padding: 8px; border: 1px solid #ccc; text-align:right;">$${(cart.total_price/100).toFixed(2)}</td>
//           </tr>
//         </tbody>
//       </table>`;
//       document.querySelector('.Total').innerHTML = paymentHTML;

//       // Add event listeners for remove buttons
//       document.querySelectorAll('.remove-property-btn').forEach(btn => {
//         btn.addEventListener('click', function() {
//           const key = this.getAttribute('data-line-item-key');
//           const serviceType = this.getAttribute('data-service-type');
//           // Remove both the property and its associated service type from the cart
//           fetch('/cart.js')
//             .then(res => res.json())
//             .then(cart => {
//               const itemsToRemove = cart.items.filter(item =>
//                 item.key === key || (item.properties && item.properties.ServiceType === serviceType)
//               );
//               const updates = {};
//               itemsToRemove.forEach(item => {
//                 updates[item.key] = 0;
//               });
//               fetch('/cart/update.js', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({ updates })
//               })
//               .then(() => {
//                 // After update, check if cart is empty
//                 fetch('/cart.js')
//                   .then(res => res.json())
//                   .then(newCart => {
//                     if (newCart.items.length === 0) {
//                       document.querySelector('.final-process').classList.add('hide');
//                       document.querySelector('.process-one').classList.remove('hide');
//                       document.querySelector('.process-header h1').textContent = 'Property Management Process';
//                       const progress = document.querySelector('.progress-container .progress');
//                       if (progress) progress.style.width = '25%';
//                       // Reset stepper header
//                       document.querySelectorAll('.steps .step').forEach((step, idx) => {
//                         step.classList.remove('step--active', 'step--complete', 'step--inactive');
//                         if (idx === 0) {
//                           step.classList.add('step--active');
//                         }
//                       });
//                       if (typeof setActiveStep === 'function') {
//                         setActiveStep('process-icon-one');
//                       }
//                     } else {
//                       renderFinalOverview();
//                     }
//                   });
//               });
//             });
//         });
//       });
//     });
// }
