
const fillTotalDevicesFromSearch = function (amount) {
  totalDevicesFromSearch = amount;
  [...document.getElementsByClassName('amountOfDevices')].forEach((e) => e.innerHTML = String(totalDevicesFromSearch));
  let pluralElements = [...document.getElementsByClassName('plural')];
  if (totalDevicesFromSearch > 1) pluralElements.forEach((e) => e.innerHTML = 's');
  else pluralElements.forEach((e) => e.innerHTML = '');
};

const macRegex = /^([0-9A-Fa-f]{2}:){5}([0-9A-Fa-f]{2})$/;
const ipv4Regex = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const ipv6Regex = /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}$|^(?:[0-9a-f]{1,4}:){6}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/i;
// const ipv6Regexp = /^[0-9a-f]{1,4}(?::[0-9a-f]{1,4}){7}$|^::(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?$|^(?:[0-9a-f]{1,4}:){1,6}:$|^(?:[0-9a-f]{1,4}:)+(?::[0-9a-f]{1,4})+$/i
const domainNameRegex = /^[0-9a-z]+(?:-[0-9a-z]+)*(?:\.[0-9a-z]+(?:-[0-9a-z]+)*)+$/i;
const testIPv6 = function (ipv6) {
  if (ipv6 !== undefined && ipv6.constructor !== String) return false;
  let parts = ipv6.split(':');
  let maxparts = /:\d{1,3}\./.test(ipv6) ? 7 : 8; // has an ipv4 at the end or not.
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
let isFqdnValid = (fqdn) => domainNameRegex.test(fqdn) || ipv4Regex.test(fqdn) || testIPv6(fqdn);
let setFieldValidLabel = (target) => {
  target.nextElementSibling.style.display = 'none';
  target.setCustomValidity('');
}
let setFieldInvalidLabel = (target) => {
  target.nextElementSibling.style.display = 'block';
  target.setCustomValidity('Insira um endereço válido');
}
let checkFqdn = (e) =>
  isFqdnValid(e.target.value) ? setFieldValidLabel(e.target) : setFieldInvalidLabel(e.target);
let datalistFqdn = (e) => e.target.value === "Apagar" || e.target.value === "Não alterar" ||
  e.target.value === '' ? setFieldValidLabel(e.target) : checkFqdn(e);
let checkDeviceFqdn = (e) =>
  e.target.value === '' ? setFieldValidLabel(e.target) : checkFqdn(e);

let hideModalShowAllert = function (modalJQueryElement, message, type, shouldReload=false) {
  modalJQueryElement.modal('hide').on('hidden.bs.modal', function() {
    displayAlertMsg({message: message, type: type});
    modalJQueryElement.off('hidden.bs.modal');
    if (shouldReload) setTimeout(() => window.location.reload(), 1000);
  });
};

let totalDevicesFromSearch = 0; // The amount of devices in search result from device list.

$(document).ready(function() {
  let deviceForm = document.getElementById("data_collecting_deviceForm");
  let serviceModal = $('#data_collecting-service-modal');
  let deviceModal = $('#data_collecting-device-modal');
  let deviceRow;

  let getDeviceParameters = (row) => ({
    is_active: row.getAttribute('data-data_collecting-is_active') === 'true',
    has_latency: row.getAttribute('data-data_collecting-has_latency') === 'true',
    ping_fqdn: row.getAttribute('data-data_collecting-ping_fqdn') || '',
  })

  let setDeviceParameters = (row, parameters) => {
    row.setAttribute('data-data_collecting-is_active', ''+parameters.is_active);
    row.setAttribute('data-data_collecting-has_latency', ''+parameters.has_latency);
    row.setAttribute('data-data_collecting-ping_fqdn', parameters.ping_fqdn || '');
  }

  // the search value when the search was submitted. As it starts empty, we can initialize this variable as empty.
  let lastDevicesSearchInputQuery = '';

  // prints argument and throws argument. Can be used to fill some promise catches.
  const printsAndThrows = function (x) {
    console.log(x);
    throw x;
  };

  const unwrapsResponseJson = (res) => 
    res.status < 300 ? Promise.resolve(res.json()).catch((e) => {}) :
                       Promise.resolve(res.json()).then(printsAndThrows);

  let sendDataCollectingParameters = function(data, form, successMessage, shouldReload=false) {
    let modalElement = $(form.closest('.modal'));
    return fetch(form.getAttribute('action'), {
      method: form.getAttribute('method'),
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    })
    .catch(printsAndThrows)
    .then(unwrapsResponseJson)
    .then((body) => hideModalShowAllert(modalElement, successMessage, 'success', shouldReload))
    .catch((body) => hideModalShowAllert(modalElement, body.message, 'danger'));
  };

  let submitServiceParameters = function (event) {
    let is_active = document.getElementById('data_collecting_service_is_active');
    let alarm_fqdn = document.getElementById('data_collecting_service_alarm_fqdn');
    let ping_fqdn = document.getElementById('data_collecting_service_ping_fqdn');
    let ping_packets = document.getElementById('data_collecting_service_ping_packets');

    // FQDN text inputs.
    [alarm_fqdn, ping_fqdn].forEach((input) => {
      input.setCustomValidity('');
      input.value = input.value.trim();
      if (!isFqdnValid(input.value)) input.setCustomValidity('Insira um endereço válido');
    });

    let form = event.target;
    let valid = form.checkValidity();
    form.classList.add('was-validated');
    if (valid) {
      let data = {
        is_active: is_active.checked,
        alarm_fqdn: alarm_fqdn.value,
        ping_fqdn: ping_fqdn.value,
        ping_packets: Number(ping_packets.value)
      };
      sendDataCollectingParameters(data, form, 'Parâmetros salvos.');
    }
    return false;
  };

  let submitUpdateManyParameters = function (event) {
    let is_active = document.getElementById('data_collecting_mass_update_is_active');
    let has_latency = document.getElementById('data_collecting_mass_update_has_latency');
    let ping_fqdn = document.getElementById('data_collecting_mass_update_ping_fqdn');
    [ping_fqdn].forEach((input) => {
      input.setCustomValidity('');
      input.value = input.value.trim();
    })

    // defining boolean set statements. we never unset boolean parameters.
    let data = {};
    let anyChange = false;
    let booleanFields = { // these are not check boxes. values can be true, false or no change.
      is_active: is_active.value,
      has_latency: has_latency.value
    };
    for (let fieldname of booleanFields) {
      let value = booleanFields[fieldname];
      if (value === '') continue;
      if (value === "True") value = true;
      else if (value === "False") value = false;
      if (data.$set === undefined) data.$set = {};
      data.$set[fieldname] = value;
      anyChange = true;
    }

    // defining ping_fqdn set or unset statement for mass update input text.
    if (ping_fqdn.value === "Apagar") { // when to unset.
      if (data.$unset === undefined) data.$unset = {};
      data.$unset['ping_fqdn'] = '';
      anyChange = true;
    } else if (ping_fqdn.value !== '' && ping_fqdn.value !== "Não alterar") { // when to set.
      if (data.$set === undefined) data.$set = {};
      // if invalid, set input as invalid. if valid, set data.
      if (!isFqdnValid(ping_fqdn.value)) ping_fqdn.setCustomValidity('Insira um endereço válido');
      else data.$set['ping_fqdn'] = ping_fqdn.value;
      anyChange = true;
    }

    if (anyChange) {
      let form = event.target;
      let valid = form.checkValidity();
      form.classList.add('was-validated');
      if (valid) {
        data.filter_list = lastDevicesSearchInputQuery;
        let plural = totalDevicesFromSearch > 1 ? 's' : '';
        let msg = `Parâmetros salvos em ${totalDevicesFromSearch} dispositivo${plural}.` 
        sendDataCollectingParameters(data, form, msg, true);
      }
    } else {
      hideModalShowAllert(serviceModal, 'Nada a ser alterado', 'danger');
    }
    return false;
  };

  let submitDeviceParameters = function (event) {
    try{
    is_active = document.getElementById('data_collecting_device_is_active');
    has_latency = document.getElementById('data_collecting_device_has_latency');
    ping_fqdn = document.getElementById('data_collecting_device_ping_fqdn');
    [ping_fqdn].forEach((input) => { // all text fields.
      input.setCustomValidity('');
      input.value = input.value.trim();
      if (input.value !== '' && !isFqdnValid(input.value)) input.setCustomValidity('Insira um endereço válido');
    })

    // checking if submitted data is any different from data already saved.
    let submittedDeviceData = { // user submitted data.
      is_active: is_active.checked,
      has_latency: has_latency.checked,
      ping_fqdn: ping_fqdn.value,
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
        let data = {
          $set: {
            is_active: is_active.checked,
            has_latency: has_latency.checked
          }
        };

        // FQDN text inputs.
        let textInputs = {ping_fqdn};
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
        sendDataCollectingParameters(data, form, `Parâmetros salvos para o dispositivo ${deviceId}.`);
      }
    } else {
      hideModalShowAllert(deviceModal, 'Nada a ser alterado', 'danger');
    }
  }catch(e){console.log(e)}
    return false;
  };

  let loadDeviceParamaters = function (event) {
    deviceRow = event.target.closest('tr');
    let deviceId = deviceRow.getAttribute('data-deviceid');
    deviceForm.setAttribute('data-id', deviceId);
    deviceForm.setAttribute('action', `/data_collecting/${deviceId.replace(/:/g, '_')}/parameters`);
    deviceForm.classList.remove('was-validated');
    document.getElementById('data_collecting_deviceId').innerHTML = deviceId;

    let is_active = document.getElementById('data_collecting_device_is_active');
    let has_latency = document.getElementById('data_collecting_device_has_latency');
    let ping_fqdn = document.getElementById('data_collecting_device_ping_fqdn');

    let parameters = getDeviceParameters(deviceRow);
    is_active.checked = parameters.is_active;
    has_latency.checked = parameters.has_latency;
    ping_fqdn.value = parameters.ping_fqdn;
    [ping_fqdn].forEach((input) => { // for every text input.
      if (input) {
        input.setCustomValidity('');
        setFieldValidLabel(input);
        if (input.value !== '') input.previousElementSibling.classList.add('active');
      }
    });
    deviceModal.modal('show');
  };

  let hideShowPannel = function (event) {
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
  [...document.getElementsByClassName('panel-arrow')].forEach((e) => e.addEventListener("click", hideShowPannel));
  let serviceForm = document.getElementById('data_collecting_serviceForm');
  if (serviceForm) {
    serviceForm.onsubmit = submitServiceParameters;
  }
  let updateManyForm = document.getElementById('data_collecting_updateManyForm');
  if (updateManyForm) {
    updateManyForm.onsubmit = submitUpdateManyParameters;
  }
  let searchForm = document.getElementById('devices-search-form');
  if (serviceForm) {
    searchForm.addEventListener('submit', () => {
      // when a search is submitted, we save the value that was in the search input.
      lastDevicesSearchInputQuery = document.getElementById('devices-search-input').value;
      return false;
    });
  }
  $(document).on('click', '.btn-data_collecting-device-modal', loadDeviceParamaters);
  if (deviceForm) {
    deviceForm.onsubmit = submitDeviceParameters;
  }
});

export {fillTotalDevicesFromSearch};
