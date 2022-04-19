import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg} from './common_actions.js';

const t = i18next.t;

// updating text, in some elements, when device search is done.
const fillTotalDevicesFromSearch = function(amount) {
  totalDevicesFromSearch = amount;
  [...document.getElementsByClassName('nDevicesWillBeChanged')].forEach(
    (e) => e.innerHTML = t('nDevicesWillBeChanged',
                           {count: totalDevicesFromSearch}));
};

const ipv4Regex = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const ipv6Regex = /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}$|^(?:[0-9a-f]{1,4}:){6}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/i;
// const ipv6Regexp = /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}$|^::(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?$|^(?:[0-9a-f]{1,4}:){1,6}:$|^(?:[0-9a-f]{1,4}:)+(?::[0-9a-f]{1,4})+$/i
const domainNameRegex = /^[0-9a-z]+(?:-[0-9a-z]+)*(?:\.[0-9a-z]+(?:-[0-9a-z]+)*)+$/i;

const testIPv6 = function(ipv6) {
  if (ipv6 !== undefined && ipv6.constructor !== String) return false;
  let parts = ipv6.split(':');
  // has an ipv4 at the end or not
  let maxparts = /:\d{1,3}\./.test(ipv6) ? 7 : 8;
  if (parts.length > maxparts || parts.length < 3) return false;
  let hasDoubleColon = ipv6.indexOf('::') > -1;
  if (parts.length === maxparts && hasDoubleColon) return false;
  if (hasDoubleColon) {
    let notEmptyCounter = 0;
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].length > 0) notEmptyCounter++;
    }
    let remaining = maxparts-notEmptyCounter;
    let substitute = ipv6[0] === ':' ? '' : ':';
    for (let i = 0; i < remaining; i++) substitute += '0:';
    if (ipv6[ipv6.length-1] === ':') substitute = substitute.slice(0, -1);
    ipv6 = ipv6.replace('::', substitute);
  }
  return ipv6Regex.test(ipv6);
};

let isFqdnValid = (fqdn) => domainNameRegex.test(fqdn) ||
                            ipv4Regex.test(fqdn) || testIPv6(fqdn);

let setFieldValidLabel = (target) => {
  target.nextElementSibling.style.display = 'none';
  target.setCustomValidity('');
};

let setFieldInvalidLabel = (target) => {
  target.nextElementSibling.style.display = 'block';
  target.setCustomValidity(t('inputValidAddress'));
};

window.checkFqdn = (e) => isFqdnValid(e.target.value) ?
                          setFieldValidLabel(e.target) :
                          setFieldInvalidLabel(e.target);

window.datalistFqdn = (e) => {
  if (e.target.value === t('Erase') || e.target.value === t('doNotChange') ||
      e.target.value === '') {
    setFieldValidLabel(e.target);
  } else {
    window.checkFqdn(e);
  }
};

window.checkDeviceFqdn = (e) => e.target.value === '' ?
                                setFieldValidLabel(e.target) :
                                window.checkFqdn(e);

let hideModalShowAllert = function(modalJQueryElement, message,
                                   type, shouldReload=false) {
  modalJQueryElement.modal('hide').on('hidden.bs.modal', function() {
    displayAlertMsg({message: message, type: type});
    modalJQueryElement.off('hidden.bs.modal');
    if (shouldReload) setTimeout(() => window.location.reload(), 1000);
  });
};

// The amount of devices in search result from device list.
let totalDevicesFromSearch = 0;

anlixDocumentReady.add(function() {
  let deviceForm = document.getElementById('data_collecting_deviceForm');
  let serviceModal = $('#data_collecting-service-modal');
  let deviceModal = $('#data_collecting-device-modal');
  let deviceRow;

  let getDeviceParameters = (row) => ({
    is_active: row.getAttribute('data-data_collecting-is_active') === 'true',
    has_latency:
      row.getAttribute('data-data_collecting-has_latency') === 'true',
    ping_fqdn: row.getAttribute('data-data_collecting-ping_fqdn') || '',
  });

  let setDeviceParameters = (row, parameters) => {
    row.setAttribute('data-data_collecting-is_active', '' +
                     parameters.is_active);
    row.setAttribute('data-data_collecting-has_latency', '' +
                     parameters.has_latency);
    row.setAttribute('data-data_collecting-ping_fqdn',
                     parameters.ping_fqdn || '');
  };

  // the search value when the search was submitted.
  // As it starts empty, we can initialize this variable as empty.
  let lastDevicesSearchInputQuery = '';

  // prints argument and throws argument.
  // Can be used to fill some promise catches.
  const printsAndThrows = function(x) {
    console.log(x);
    throw x;
  };

  const unwrapsResponseJson = (res) => {
    if (res.status < 300) {
      Promise.resolve(res.json()).catch((e) => {});
    } else {
      Promise.resolve(res.json()).then(printsAndThrows);
    }
  };

  let sendDataCollectingParameters = function(data, form, successMessage,
                                              shouldReload=false) {
    let modalElement = $(form.closest('.modal'));
    return fetch(form.getAttribute('action'), {
      method: form.getAttribute('method'),
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    })
    .catch(printsAndThrows)
    .then(unwrapsResponseJson)
    .then((body) => hideModalShowAllert(modalElement, successMessage,
                                        'success', shouldReload))
    .catch((body) => hideModalShowAllert(modalElement, body.message, 'danger'));
  };

  let submitServiceParameters = function(event) {
    let isActive = document.getElementById('data_collecting_service_is_active');
    let alarmFqdn =
      document.getElementById('data_collecting_service_alarm_fqdn');
    let pingFqdn = document.getElementById('data_collecting_service_ping_fqdn');
    let pingPackets =
      document.getElementById('data_collecting_service_ping_packets');

    // FQDN text inputs.
    [alarmFqdn, pingFqdn].forEach((input) => {
      input.setCustomValidity('');
      input.value = input.value.trim();
      if (!isFqdnValid(input.value)) {
        input.setCustomValidity(t('inputValidAddress'));
      }
    });

    let form = event.target;
    let valid = form.checkValidity();
    form.classList.add('was-validated');
    if (valid) {
      let data = {
        is_active: isActive.checked,
        alarm_fqdn: alarmFqdn.value,
        ping_fqdn: pingFqdn.value,
        ping_packets: Number(pingPackets.value ?
          pingPackets.value : pingPackets.placeholder),
      };
      sendDataCollectingParameters(data, form, t('parametersSaved'));
    }
    return false;
  };

  let submitUpdateManyParameters = function(event) {
    let isActive =
      document.getElementById('data_collecting_mass_update_is_active');
    let hasLatency =
      document.getElementById('data_collecting_mass_update_has_latency');
    let pingFqdn =
      document.getElementById('data_collecting_mass_update_ping_fqdn');
    [pingFqdn].forEach((input) => {
      input.setCustomValidity('');
      input.value = input.value.trim();
    });

    // defining boolean set statements. we never unset boolean parameters.
    let data = {};
    let anyChange = false;
    // these are not check boxes. values can be true, false or no change.
    let booleanFields = {
      is_active: isActive.value,
      has_latency: hasLatency.value,
    };
    for (let fieldname of Object.keys(booleanFields)) {
      let value = booleanFields[fieldname];
      if (value === '') continue;
      if (value === 'True') value = true;
      else if (value === 'False') value = false;
      if (data.$set === undefined) data.$set = {};
      data.$set[fieldname] = value;
      anyChange = true;
    }

    // defining ping_fqdn set or unset statement for mass update input text.
    if (pingFqdn.value === t('Erase')) { // when to unset.
      if (data.$unset === undefined) data.$unset = {};
      data.$unset['ping_fqdn'] = '';
      anyChange = true;
    // when to set.
    } else if (pingFqdn.value !== '' && pingFqdn.value !== t('doNotChange')) {
      if (data.$set === undefined) data.$set = {};
      // if invalid, set input as invalid. if valid, set data.
      if (!isFqdnValid(pingFqdn.value)) {
        pingFqdn.setCustomValidity(t('inputValidAddres'));
      } else {
        data.$set['ping_fqdn'] = pingFqdn.value;
      }
      anyChange = true;
    }

    if (anyChange) {
      let form = event.target;
      let valid = form.checkValidity();
      form.classList.add('was-validated');
      if (valid) {
        data.filter_list = lastDevicesSearchInputQuery;
        let msg =
          t('parametersSavedForNDevices', {total: totalDevicesFromSearch});
        sendDataCollectingParameters(data, form, msg, true);
      }
    } else {
      hideModalShowAllert(serviceModal, t('nothingToChange'), 'danger');
    }
    return false;
  };

  let submitDeviceParameters = function(event) {
    try {
      let isActive =
        document.getElementById('data_collecting_device_is_active');
      let hasLatency =
        document.getElementById('data_collecting_device_has_latency');
      let pingFqdn =
        document.getElementById('data_collecting_device_ping_fqdn');
      [pingFqdn].forEach((input) => { // all text fields.
        input.setCustomValidity('');
        input.value = input.value.trim();
        if (input.value !== '' && !isFqdnValid(input.value)) {
          input.setCustomValidity(t('inputValidAddres'));
        }
      });

      // checking if submitted data is any different from data already saved.
      let submittedDeviceData = { // user submitted data.
        is_active: isActive.checked,
        has_latency: hasLatency.checked,
        ping_fqdn: pingFqdn.value,
      };
      let savedDeviceData = getDeviceParameters(deviceRow);
      let anyChange = false;
      for (let key in savedDeviceData) {
        if (savedDeviceData[key] !== submittedDeviceData[key]) {
          anyChange = true;
          break;
        }
      }

      if (anyChange) {
        let form = event.target;
        let valid = form.checkValidity();
        form.classList.add('was-validated');
        let deviceId = form.getAttribute('data-id');

        if (valid) {
          let data = {$set: {
            is_active: isActive.checked,
            has_latency: hasLatency.checked,
          }};

          // FQDN text inputs.
          let textInputs = {pingFqdn};
          // eslint-disable-next-line guard-for-in
          for (let key in textInputs) {
            let input = textInputs[key];
            if (input.value === '') {
              if (data.$unset === undefined) data.$unset = {};
              data.$unset[key] = '';
            } else {
              data.$set[key] = input.value;
            }
          }

          setDeviceParameters(deviceRow, submittedDeviceData);
          sendDataCollectingParameters(
            data,
            form,
            t('savedParametersForDeviceId', {deviceId: deviceId}),
          );
        }
      } else {
        hideModalShowAllert(deviceModal, t('nothingToChange'), 'danger');
      }
    } catch (e) {
      console.log(e);
    }
    return false;
  };

  let loadDeviceParamaters = function(event) {
    deviceRow = event.target.closest('tr');
    let deviceId = deviceRow.getAttribute('data-deviceid');
    deviceForm.setAttribute('data-id', deviceId);
    deviceForm.setAttribute(
      'action', `/data_collecting/${deviceId.replace(/:/g, '_')}/parameters`);
    deviceForm.classList.remove('was-validated');
    document.getElementById('data_collecting_deviceId').innerHTML =
      t('dataCollectingForDeviceId', {id: deviceId});

    let isActive = document.getElementById('data_collecting_device_is_active');
    let hasLatency =
      document.getElementById('data_collecting_device_has_latency');
    let pingFqdn = document.getElementById('data_collecting_device_ping_fqdn');

    let parameters = getDeviceParameters(deviceRow);
    isActive.checked = parameters.is_active;
    hasLatency.checked = parameters.has_latency;
    pingFqdn.value = parameters.ping_fqdn;
    [pingFqdn].forEach((input) => { // for every text input.
      if (input) {
        input.setCustomValidity('');
        setFieldValidLabel(input);
        if (input.value !== '') {
          input.previousElementSibling.classList.add('active');
        }
      }
    });
    deviceModal.modal('show');
  };

  let hideShowPannel = function(event) {
    let arrow = event.target;
    let arrowClasses = arrow.classList;
    let panelStyle = arrow.parentElement.parentElement.nextElementSibling.style;
    if (arrowClasses.contains('text-primary')) {
      arrowClasses.remove('text-primary', 'fa-chevron-up');
      arrowClasses.add('fa-chevron-down');
      panelStyle.display = 'none';
    } else {
      arrowClasses.remove('fa-chevron-down');
      arrowClasses.add('text-primary', 'fa-chevron-up');
      panelStyle.display = 'block';
    }
  };

  let btnDataCollecting = document.getElementById('btn-data_collecting-modal');
  if (btnDataCollecting) {
    btnDataCollecting.onclick = (event) => serviceModal.modal('show');
  }
  [...document.getElementsByClassName('panel-arrow')].forEach(
    (e) => e.addEventListener('click', hideShowPannel));

  let serviceForm = document.getElementById('data_collecting_serviceForm');
  if (serviceForm) {
    serviceForm.onsubmit = submitServiceParameters;
  }
  let updateManyForm =
    document.getElementById('data_collecting_updateManyForm');
  if (updateManyForm) {
    updateManyForm.onsubmit = submitUpdateManyParameters;
  }
  let searchForm = document.getElementById('devices-search-form');
  if (serviceForm) {
    searchForm.addEventListener('submit', () => {
      // when a search is submitted, we save
      // the value that was in the search input.
      lastDevicesSearchInputQuery =
        document.getElementById('devices-search-input').value;
      return false;
    });
  }
  $(document).on('click', '.btn-data_collecting-device-modal',
                 loadDeviceParamaters);
  if (deviceForm) {
    deviceForm.onsubmit = submitDeviceParameters;
  }
});

export {fillTotalDevicesFromSearch};
