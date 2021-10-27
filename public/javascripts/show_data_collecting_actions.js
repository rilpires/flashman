import {displayAlertMsg} from './common_actions.js';

const fillTotalDevicesFromSearch = function(amount) {
  totalDevicesFromSearch = amount;
  [...document.getElementsByClassName('amountOfDevices')].forEach(
    (e) => e.innerHTML = String(totalDevicesFromSearch));
  let pluralElements = [...document.getElementsByClassName('plural')];
  if (totalDevicesFromSearch > 1) {
    pluralElements.forEach((e) => e.innerHTML = 's');
  } else {
    pluralElements.forEach((e) => e.innerHTML = '');
  }
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
  target.setCustomValidity('Insira um endereço válido');
};

window.checkFqdn = (e) => isFqdnValid(e.target.value) ?
                          setFieldValidLabel(e.target) :
                          setFieldInvalidLabel(e.target);

window.datalistFqdn = (e) => {
  if (e.target.value === 'Apagar' || e.target.value === 'Não alterar' ||
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

$(document).ready(function() {
  // // data_collecting parameters for service.
  // let serviceParameters = {
  //   is_active: Boolean,
  //   has_latency: Boolean,
  //   burst_loss: Boolean,
  //   conn_pings: Boolean,
  //   wifi_devices: Boolean,
  //   ping_fqdn: String,
  //   alarm_fqdn: String,
  //   ping_packets: Number,
  // }
  // // separating elements into data types.
  // let serviceBooleans = {};
  // let serviceStrings = {};
  // let serviceNumbers = {};
  // for (let name in serviceParameters) {
  //   let element = document.getElementById('data_collecting_service_'+name);
  //   if (serviceParameters[name] === Boolean)  serviceBooleans[name] = element;
  //   else if (serviceParameters[name] === String) serviceStrings[name] = element;
  //   else if (serviceParameters[name] === Number)  serviceNumbers[name] = element;
  // }

  // // data_collecting parameters for device.
  // let deviceParameters = {
  //   is_active: Boolean,
  //   has_latency: Boolean,
  //   burst_loss: Boolean,
  //   conn_pings: Boolean,
  //   wifi_devices: Boolean,
  //   ping_fqdn: String,
  // }
  // // separating elements into data types.
  // let deviceBooleans = {};
  // let deviceStrings = {};
  // // let deviceNumbers = {};
  // for (let name in deviceParameters) {
  //   let element = document.getElementById('data_collecting_device_'+name);
  //   if (deviceParameters[name] === Boolean)  deviceBooleans[name] = element;
  //   else if (deviceParameters[name] === String) deviceStrings[name] = element;
  //   // else if (deviceParameters[name] === Number)  deviceNumbers[name] = element;
  // }
  // // separating elements into data types.
  // let massUpdateBooleans = {};
  // let massUpdateStrings = {};
  // // let massUpdateNumbers = {};
  // for (let name in deviceParameters) {
  //   let element = document.getElementById('data_collecting_mass_update_'+name);
  //   if (deviceParameters[name] === Boolean)  deviceBooleans[name] = element;
  //   else if (deviceParameters[name] === String) deviceStrings[name] = element;
  //   // else if (deviceParameters[name] === Number)  deviceNumbers[name] = element;
  // }
  // // all validation functions used in parameters. As service and device
  // // parameters were named the same, we can define each parameter only once.
  // let validations = {
  //   ping_fqdn: isFqdnValid,
  //   alarm_fqdn: isFqdnValid,
  // }
  // let invalidMessages = { // messages that appear bellow an invalid field.
  //   ping_fqdn: 'Insira um endereço válido',
  //   alarm_fqdn: 'Insira um endereço válido',
  // }

  // data_collecting parameters used in both service and device.
  let parameters = {
    is_active: {type: Boolean, service: true, device: true},
    has_latency: {type: Boolean, service: true, device: true},
    burst_loss: {type: Boolean, service: true, device: true},
    conn_pings: {type: Boolean, service: true, device: true},
    wifi_devices: {type: Boolean, service: true, device: true},
    ping_fqdn: {
      type: String,
      service: true, device: true,
      validations: isFqdnValid,
      invalidMessage: 'Insira um endereço válido'},
    alarm_fqdn: {
      type: String,
      service: true, device: true,
      validations: isFqdnValid, invalidMessage: 'Insira um endereço válido'},
    ping_packets: { // validation for ping_packets is done directly in html.
      type: Number,
      service: true, 
      invalidMessage: 'Insira um número inteiro entre 0 e 100.'
    },
  }
  for (let name in parameters) {
    let p = parameters[name];
    if (p.service) { // if service is true.
      // substituting it with the html element that holds its value.
      p.service = document.getElementById('data_collecting_service_'+name)
    }
    if (p.device) { // if device is true.
      // substituting it with the html element that holds its value.
      p.service = document.getElementById('data_collecting_device_'+name)
      // creating an attribute pointing to the html element that holds the mass update value.
      p.massUpdate = document.getElementById('data_collecting_mass_update_'+name)
    }
  }


  let deviceForm = document.getElementById('data_collecting_deviceForm');
  let serviceModal = $('#data_collecting-service-modal');
  let deviceModal = $('#data_collecting-device-modal');
  let deviceRow;

  let getDeviceParameters = (row) => {
    let ret = {};
    for (let name in deviceParameters) {
      let value = row.getAttribute('data-data_collecting-'+name);
      if (deviceParameters[name] === Boolean) value = value === 'true';
      else if (deviceParameters[name] === String) value = value || '';
      ret[name] = value;
    }
    return ret;
  };

  let setDeviceParameters = (row, parameters) => {
    for (let name in deviceParameters) {
      let value = parameters[name];
      if (deviceParameters[name] === Boolean) value = ''+value;
      else if (deviceParameters[name] === String) value = value || '';
      row.setAttribute('data-data_collecting-'+name, value);
    }
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
    // for text fields, resetting custom validity, trimming and executing validation.
    for (let name in parameters) {
      let p = parameters[name];
      let input = p.service; // the html element.
      // if parameter name not defined in service or parameter not of type string.
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
        let value;
        // reading element value for each data type.
        if (p.type === Boolean) value = p.service.checked;
        else if (p.type === String) value = p.service.value;
        else if (p.type === Number) value = Number(p.service.value);
        data[name] = value; // assigning value to data to be submitted.
      }
      sendDataCollectingParameters(data, form, 'Parâmetros salvos.');
    }
    return false;
  };

  let submitUpdateManyParameters = function(event) {
    // // for text fields, resetting custom validity and trimming.
    // for (let name in parameters) {
    //   let p = parameters[name];
    //   // if parameter name not defined in service or parameter not of type string.
    //   if (!p.massUpdate || p.type !== String) continue;

    //   let input = p.massUpdate; // the html element.
    //   input.setCustomValidity('');
    //   input.value = input.value.trim();
    // }

    let data = {}; // data to be submitted.
    let anyChange = false;

    // // defining boolean set statements. we never unset boolean parameters.
    // // these are not check boxes. values can be true, false or no change.
    // for (let fieldname of massUpdateBooleans) {
    //   let value = massUpdateBooleans[fieldname].value;
    //   if (value === '') continue;
    //   if (value === 'True') value = true;
    //   else if (value === 'False') value = false;
    //   if (data.$set === undefined) data.$set = {};
    //   data.$set[fieldname] = value;
    //   anyChange = true;
    // }

    // // defining set or unset statement for mass update input text.
    // for (let name in massUpdateStrings) {
    //   let input = massUpdateStrings[name];
    //   if (input.value === 'Apagar') { // when we have to unset.
    //     if (data.$unset === undefined) data.$unset = {};
    //     data.$unset[name] = '';
    //     anyChange = true;
    //   // when we have to set.
    //   } else if (input.value !== '' && input.value !== 'Não alterar') {
    //     if (data.$set === undefined) data.$set = {};
    //     // if invalid, sets input as invalid. if valid, sets data.
    //     if (!validations[name](input.value)) {
    //       input.setCustomValidity(invalidMessages[name]);
    //     } else {
    //       data.$set[name] = input.value;
    //     }
    //     anyChange = true;
    //   }
    // }

    for (let name in parameters) {
      let p = parameters[name];
      let input = p.massUpdate; // the html element.
      if (!input) continue; // if attribute 'massUpdate' is not defined, skip parameter.

      // these are not check boxes. values can be true, false or no change.
      if (p.type === Boolean) {
        let value = input.value; // value
        if (value === '') continue;
        if (value === 'True') value = true;
        else if (value === 'False') value = false;

        // defining boolean set statements. we never unset boolean parameters.
        if (data.$set === undefined) data.$set = {};
        data.$set[fieldname] = value;
        anyChange = true;

      // defining set or unset statement for mass update input text.
      } else if (p.type === String) {
        input.setCustomValidity('');
        input.value = input.value.trim();
        // when we have to unset.
        if (input.value === 'Apagar') {
          if (data.$unset === undefined) data.$unset = {};
          data.$unset[name] = '';
          anyChange = true;
        // when we have to set.
        } else if (input.value !== '' && input.value !== 'Não alterar') {
          if (data.$set === undefined) data.$set = {};
          // if invalid, sets input as invalid. if valid, sets data.
          if (p.validation !== undefined && !p.validation(input.value)) {
            input.setCustomValidity(p.invalidMessage);
          } else {
            data.$set[name] = input.value;
          }
          anyChange = true;
        }

      } else if (p.type === Number) { // currently no numeric parameters exist for device.
        let value = input.value; // value
        if (value === '') continue;
        let numericValue = Number(value);
        if (isNaN(numericValue)) {
          input.setCustomValidity('Valor não é numérico');
          continue
        }
        if (p.validation !== undefined && !p.validation(value)) {
          input.setCustomValidity(p.invalidMessage);
        } else {
          if (data.$set === undefined) data.$set = {};
          data.$set[fieldname] = value;
        }
        anyChange = true;

      // defining set or unset statement for mass update input text.
      }
    }

    if (anyChange) {
      let form = event.target;
      let valid = form.checkValidity();
      form.classList.add('was-validated');
      if (valid) {
        data.filter_list = lastDevicesSearchInputQuery;
        let plural = totalDevicesFromSearch > 1 ? 's' : '';
        let msg = `Parâmetros salvos em ${totalDevicesFromSearch} dispositivo${plural}.`;
        sendDataCollectingParameters(data, form, msg, true);
      }
    } else {
      hideModalShowAllert(serviceModal, 'Nada a ser alterado', 'danger');
    }
    return false;
  };

  let submitDeviceParameters = function(event) {
    // [deviceStrings.ping_fqdn].forEach((input) => { // all FQDN fields.
    //   input.setCustomValidity('');
    //   input.value = input.value.trim();
    //   if (input.value !== '' && !isFqdnValid(input.value)) {
    //     input.setCustomValidity('Insira um endereço válido');
    //   }
    // });

    // // checking if new data is any different from data already saved.
    // let newDeviceData = {}; // device's new data.
    // for (let name in deviceBooleans) newDeviceData[name] = deviceBooleans[name].checked;
    // for (let name in deviceStrings) newDeviceData[name] = deviceStrings[name].value;
    // // for (let name in deviceNumbers) newDeviceData[name] = Number(deviceNumbers[name].value);

    // // checking if there is any change, before submitting data.
    // let savedDeviceData = getDeviceParameters(deviceRow);
    // let anyChange = false;
    // for (let key in savedDeviceData) {
    //   if (savedDeviceData[key] !== newDeviceData[key]) {
    //     anyChange = true;
    //     break;
    //   }
    // }

    let savedDeviceData = getDeviceParameters(deviceRow); // data for device in device_list.
    let data = {$set: {}}; // data to be submitted.
    let anyChange = false;
    for (let name in parameters) {
      let p = parameters[name];
      let input = p.device; // the html element.
      if (!input) continue; // if attribute 'device' is not defined, skip parameter.

      let value;

      if (p.type === Boolean) {
        value = input.checked; // reading parameter value from html element.
        data.$set[name] = value; // adding value to data to be submitted.
        if (value !== savedDeviceData[name]) anyChange = true; // checking change.

      } else if (p.type === String) {
        input.setCustomValidity(''); // resetting validation.
        input.value = input.value.trim(); // trimming data and updating value.
        // validating data.
        if (input.value !== '' && p.validation !== undefined && !p.validation(input.value)) {
          input.setCustomValidity(p.invalidMessage); // setting message for invalid field.
        }
        value = input.value; // reading parameter value from html element.
        // adding value to data to be submitted.
        if (value === '') { // empty string means we should remove data from database.
          if (data.$unset === undefined) data.$unset = {}; // if unset field is not defined yet.
          data.$unset[name] = ''; // adding name to data to be submitted. any value will work.
        } else { // any other string value should be set as is (validation has already happened).
          data.$set[name] = value; // adding value to data to be submitted.
        }
        if (value !== savedDeviceData[name]) anyChange = true;
      } else if (p.type === Number) { // currently no numeric parameters exist for device.
        value = Number(input.value); // reading parameter value from html element.
        data.$set[name] = value; // adding value to data to be submitted.
        if (value !== savedDeviceData[name]) anyChange = true; // checking change.
      }
    }

    if (anyChange) {
      let form = event.target;
      let valid = form.checkValidity();
      form.classList.add('was-validated');
      let deviceId = form.getAttribute('data-id');

      if (valid) {
        setDeviceParameters(deviceRow, newDeviceData);
        sendDataCollectingParameters(data, form,
          `Parâmetros salvos para o dispositivo ${deviceId}.`);
      }
    } else {
      hideModalShowAllert(deviceModal, 'Nada a ser alterado', 'danger'); // we should change this from 'danger' to 'warn' or 'warning'.
    }
    return false;
  };

  let loadDeviceParamaters = function(event) {
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
      if (!input) continue; // if attribute 'device' is not defined, skip parameter.

      let value = deviceParameters[name] // value from device_list.
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
    // Object.values(deviceStrings).forEach((input) => { // for every text input.
    //   if (input) {
    //     input.setCustomValidity('');
    //     setFieldValidLabel(input);
    //     if (input.value !== '') {
    //       input.previousElementSibling.classList.add('active');
    //     }
    //   }
    // });
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
  [...document.getElementsByClassName('panel-arrow')].forEach((e) => 
    e.addEventListener('click', hideShowPannel));

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
