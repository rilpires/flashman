/* eslint-disable guard-for-in */
/* eslint-disable no-throw-literal */
import {displayAlertMsg} from './common_actions.js';

const t = i18next.t;

// updating text, in some elements, when device search is done.
const fillTotalDevicesFromSearch = function(amount) {
  totalDevicesFromSearch = amount;
  [...document.getElementsByClassName('nDevicesWillBeChanged')].forEach(
    (e) => e.innerHTML = t('nDevicesWillBeChanged',
                           {count: totalDevicesFromSearch}));
};

// The amount of devices in search result from device list.
let totalDevicesFromSearch = 0;

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

let setFieldInvalidLabel = (target, invalidMessage) => {
  target.nextElementSibling.style.display = 'block';
  target.setCustomValidity(t('inputValidAddress'));
};

window.checkFqdn = (e) => isFqdnValid(e.target.value) ?
  setFieldValidLabel(e.target) :
  setFieldInvalidLabel(e.target, t('inputValidAddress'));

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

$(document).ready(function() {
  // data_collecting parameters used in both service and device.
  let parameters = {
    is_active: {type: Boolean, service: true, device: true},
    has_latency: {type: Boolean, service: true, device: true},
    burst_loss: {type: Boolean, service: true, device: true},
    wifi_devices: {type: Boolean, service: true, device: true},
    ping_and_wan: {type: Boolean, service: true, device: true},
    ping_fqdn: {
      type: String,
      service: true, device: true,
      validations: isFqdnValid,
      invalidMessage: t('inputValidAddress'),
    },
    alarm_fqdn: {
      type: String,
      service: true,
      validations: isFqdnValid,
      invalidMessage: t('inputValidAddress'),
    },
    ping_packets: { // validation for ping_packets is done directly in html.
      type: Number,
      service: true,
      invalidMessage: t('insertANumberBetweenMinMax', {min: 1, max: 100}),
    },
  };
  for (let name in parameters) {
    let p = parameters[name];
    // if service is true, this parameter exists in config model.
    if (p.service) {
      // substituting it with the html element that holds its value.
      p.service = document.getElementById('data_collecting_service_'+name);
    }
    if (p.device) { // if device is true, this parameter exists in device model.
      // substituting it with the html element that holds its value.
      p.device = document.getElementById('data_collecting_device_'+name);
      // creating an attribute pointing to the html
      // element that holds the mass update value.
      p.massUpdate =
        document.getElementById('data_collecting_mass_update_'+name);
    }
  }

  const getDeviceParameters = (row) => {
    let ret = {};
    for (let name in parameters) {
      let p = parameters[name];
      if (!p.device) continue;
      let value = row.getAttribute('data-data_collecting-'+name);
      if (p.type === Boolean) value = value === 'true';
      else if (p.type === String) value = value || '';
      ret[name] = value;
    }
    return ret;
  };

  const setDeviceParameters = (row) => {
    for (let name in parameters) {
      let p = parameters[name];
      if (!p.device) continue;
      let value;
      if (p.type === Boolean) value = String(p.device.checked);
      else if (p.type === String) value = p.device.value || '';
      row.setAttribute('data-data_collecting-'+name, value);
    }
  };

  const unwrapsResponseJson = (res) => {
    if (res.status < 300) {
      return Promise.resolve(res.json()).catch((e) => {});
    } else if (res.status === 502) {
      // this will be caught and the message will be used in alert in screen.
      throw ({message: t('flashmanUnavailable')});
    } else {
      // will return body as raw string if we can't parse it as json.
      return Promise.resolve(res.text())
      .then((body) => {
        try {
          // this will be caught and the message
          // will be used in alert in screen.
          throw JSON.parse(body);
        } catch (e) {
          // this will be caught and the message
          // will be used in alert in screen.
          throw {message: t('jsonError')};
        }
      });
    }
  };

  const sendDataCollectingParameters = function(data, form, successMessage,
                                              shouldReload=false) {
    let modalElement = $(form.closest('.modal'));
    return fetch(form.getAttribute('action'), {
      method: form.getAttribute('method'),
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    })
    .then(unwrapsResponseJson)
    .then((body) => hideModalShowAllert(modalElement, successMessage,
                                        'success', shouldReload))
    .catch((body) => hideModalShowAllert(modalElement, body.message, 'danger'));
  };

  const submitServiceParameters = function(event) {
    // for text fields, resetting custom validity,
    // trimming and executing validation.
    for (let name in parameters) {
      let p = parameters[name];
      let input = p.service; // the html element.
      // if parameter name not defined in service
      // or parameter not of type string.
      if (!input || p.type !== String) continue;

      input.setCustomValidity('');
      input.value = input.value.trim();
      if (p.validation !== undefined && !p.validation(input.value)) {
        input.setCustomValidity(p.invalidMessage);
      }
    }

    let form = event.target;
    let valid = form.checkValidity();
    form.classList.add('was-validated');
    if (valid) {
      let data = {}; // data to be submitted.
      for (let name in parameters) {
        let p = parameters[name];
        let input = p.service;
        if (!input) continue;
        let value;
        // reading element's value for each data type.
        if (p.type === Boolean) value = input.checked;
        else if (p.type === String) value = input.value;
        else if (p.type === Number) value = Number(input.value);
        data[name] = value; // assigning value to data to be submitted.
      }
      sendDataCollectingParameters(data, form, t('parametersSaved'));
    }
    return false;
  };

  const submitUpdateManyParameters = function(event) {
    let data = {}; // data to be submitted.
    let anyChange = false;

    for (let name in parameters) {
      let p = parameters[name];
      let input = p.massUpdate; // the html element.
      if (!input) continue; // if not defined, skip parameter.

      // these are not check boxes. values can be true, false or no change.
      if (p.type === Boolean) {
        let value = input.value; // value
        if (value === '') continue;
        if (value === 'True') value = true;
        else if (value === 'False') value = false;

        // defining boolean set statements. we never unset boolean parameters.
        if (data.$set === undefined) data.$set = {};
        data.$set[name] = value;
        anyChange = true;

      // defining set or unset statement for mass update input text.
      } else if (p.type === String) {
        input.setCustomValidity('');
        input.value = input.value.trim();
        // when we have to unset.
        if (input.value === t('Erase')) {
          if (data.$unset === undefined) data.$unset = {};
          data.$unset[name] = '';
          anyChange = true;
        // when we have to set.
        } else if (input.value !== '' && input.value !== t('doNotChange')) {
          if (data.$set === undefined) data.$set = {};
          // if invalid, sets input as invalid. if valid, sets data.
          if (p.validation !== undefined && !p.validation(input.value)) {
            input.setCustomValidity(p.invalidMessage);
          } else {
            data.$set[name] = input.value;
          }
          anyChange = true;
        }

      // currently no numeric parameters exist for device.
      } else if (p.type === Number) {
        let value = input.value; // value
        if (value === '') continue;
        let numericValue = Number(value);
        if (isNaN(numericValue)) {
          input.setCustomValidity(t('notNumeric'));
          continue;
        }
        if (p.validation !== undefined && !p.validation(value)) {
          input.setCustomValidity(p.invalidMessage);
        } else {
          if (data.$set === undefined) data.$set = {};
          data.$set[name] = value;
        }
        anyChange = true;
      }
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

  const submitDeviceParameters = function(event) {
    // reading device parameters from in device_list.
    let savedDeviceData = getDeviceParameters(deviceRow);
    let data = {$set: {}}; // data to be submitted.
    let anyChange = false;

    for (let name in parameters) {
      let p = parameters[name];
      let input = p.device; // the html element.
      if (!input) continue; // if not defined, skip parameter.

      let value;

      if (p.type === Boolean) {
        value = input.checked; // reading parameter value from html element.
        data.$set[name] = value; // adding value to data to be submitted.
        // checking change.
        if (value !== savedDeviceData[name]) anyChange = true;
      } else if (p.type === String) {
        input.setCustomValidity(''); // resetting validation.
        // trimming data and updating value.
        let value = input.value = input.value.trim();
        // validating data.
        if (value !== '' && p.validation !== undefined &&
            !p.validation(value)
        ) {
          // setting message for invalid field.
          input.setCustomValidity(p.invalidMessage);
        }
        value = input.value; // reading parameter value from html element.
        // adding value to data to be submitted.

        // empty string means we should remove data from database.
        if (value === '') {
          // if unset field is not defined yet.
          if (data.$unset === undefined) data.$unset = {};
          // adding name to data to be submitted. any value will work.
          data.$unset[name] = '';
        // any other string value should be set
        // as is (validation has already happened).
        } else {
          data.$set[name] = value; // adding value to data to be submitted.
        }
        if (value !== savedDeviceData[name]) anyChange = true;
      // currently no numeric parameters exist for device.
      } else if (p.type === Number) {
        // reading parameter value from html element.
        value = Number(input.value);
        // adding value to data to be submitted.
        data.$set[name] = value;
        // checking change.
        if (value !== savedDeviceData[name]) anyChange = true;
      }
    }

    if (anyChange) {
      let form = event.target;
      let valid = form.checkValidity();
      form.classList.add('was-validated');
      let deviceId = form.getAttribute('data-id');

      if (valid) {
        setDeviceParameters(deviceRow);
        sendDataCollectingParameters(
          data,
          form,
          t('savedParametersForDeviceId', {deviceId: deviceId}),
        );
      }
    } else {
      hideModalShowAllert(deviceModal, t('nothingToChange'), 'warning');
    }
    return false;
  };

  const loadDeviceParamaters = function(event) {
    // getting device parameters from device_list table row.
    deviceRow = event.target.closest('tr');
    let deviceId = deviceRow.getAttribute('data-deviceid');
    // setting device modal form attributes.
    deviceForm.setAttribute('data-id', deviceId);
    deviceForm.setAttribute(
      'action', `/data_collecting/${deviceId.replace(/:/g, '_')}/parameters`);
    // resetting validated state for device modal form.
    deviceForm.classList.remove('was-validated');
    // ID in title of the device modal form.
    document.getElementById('data_collecting_deviceId').innerHTML = deviceId;

    let deviceParameters = getDeviceParameters(deviceRow);
    for (let name in parameters) {
      let p = parameters[name];
      let input = p.device; // the html element.
      // if attribute 'device' is not defined, skip parameter.
      if (!input) continue;

      // value from device_list.
      let value = deviceParameters[name];
      if (p.type === Boolean) {
        input.checked = value;
      } else if (p.type === String) {
        input.value = value;
        // resetting field validation after loading new device string parameter.
        setFieldValidLabel(input);
        if (input.value !== '') {
          input.previousElementSibling.classList.add('active');
        }
      } else if (p.type === Number) {
        input.value = String(value);
      }
    }
    deviceModal.modal('show');
  };

  const hideShowPannel = function(event) {
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

  let serviceModal = $('#data_collecting-service-modal');
  let deviceModal = $('#data_collecting-device-modal');
  let deviceRow;

  let btnDataCollecting = document.getElementById('btn-data_collecting-modal');
  if (btnDataCollecting) {
    btnDataCollecting.onclick = (event) => serviceModal.modal('show');
  }
  [...document.getElementsByClassName('panel-arrow')].forEach((e) =>
    e.addEventListener('click', hideShowPannel));

  let serviceForm = document.getElementById('data_collecting_serviceForm');
  if (serviceForm) serviceForm.onsubmit = submitServiceParameters;

  let massUpdateForm =
    document.getElementById('data_collecting_massUpdateForm');
  if (massUpdateForm) massUpdateForm.onsubmit = submitUpdateManyParameters;

  // the search value when the search was submitted.
  // As it starts empty, we can initialize this variable as empty.
  let lastDevicesSearchInputQuery = '';
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
  let deviceForm = document.getElementById('data_collecting_deviceForm');
  if (deviceForm) deviceForm.onsubmit = submitDeviceParameters;
});

export {fillTotalDevicesFromSearch};
