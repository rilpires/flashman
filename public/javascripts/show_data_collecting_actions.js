let fillTotalDevicesFromSearch = function (amount) {
  totalDevicesFromSearch = amount;
  [...document.getElementsByClassName('amountOfDevices')].forEach((e) => e.innerHTML = String(totalDevicesFromSearch))
  let pluralElements = [...document.getElementsByClassName('plural')]
  if (totalDevicesFromSearch > 1) pluralElements.forEach((e) => e.innerHTML = 's');
  else pluralElements.forEach((e) => e.innerHTML = '');
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
    for (let i = 0; i < parts.length; i++) { if (parts[i].length > 0) notEmptyCounter++; }
    let remaining = maxparts-notEmptyCounter;
    let substitute = ipv6[0] === ':' ? '' : ':';
    for (let i = 0; i < remaining; i++) substitute += '0:';
    if (ipv6[ipv6.length-1] === ':') substitute = substitute.slice(0, -1);
    ipv6 = ipv6.replace('::', substitute);
  }
  return ipv6Regex.test(ipv6);
};
let checkFqdn = (e) => {
  if (isFqdnValid(e.target.value)) {
    e.target.nextElementSibling.style.display = 'none';
    e.target.setCustomValidity('');
  } else {
    e.target.nextElementSibling.style.display = 'block';
    e.target.setCustomValidity('Insira um endereço válido');
  };
};
let datalistFqdn = (e) => {
  if (e.target.value === "Apagar" || e.target.value === "Não alterar") return true;
  if (isFqdnValid(e.target.value)) {
    e.target.nextElementSibling.style.display = 'none';
    e.target.setCustomValidity('');
  } else {
    e.target.nextElementSibling.style.display = 'block';
    e.target.setCustomValidity('Insira um endereço válido');
  };
};
let isFqdnValid = (fqdn) => domainNameRegex.test(fqdn) || ipv4Regex.test(fqdn) || testIPv6(fqdn);

let hideModalShowAllert = function (modalElement, message, type, shouldReload=false) {
  modalElement.modal('hide').on('hidden.bs.modal', function() {
    displayAlertMsg({message: message, type: type});
    modalElement.off('hidden.bs.modal');
    if (shouldReload) setTimeout(() => window.location.reload(), 1000);
  });
}

let sendDataCollectingParameters = function(data, form, successMessage, shouldReload=false) {
  let modalElement = $('#data_collecting');
  return fetch(form.getAttribute('action'), {
    method: form.getAttribute('method'),
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  })
  .catch((e) => {throw e})
  .then((res) => res.status < 300 ? Promise.resolve(res.json()).catch((e) => {}) : 
                                    Promise.resolve(res.json()).then((b) => {throw b}))
  .then((body) => hideModalShowAllert(modalElement, successMessage, 'success', shouldReload))
  .catch((body) => hideModalShowAllert(modalElement, body.message, 'danger'));
}

let validateServiceParameters = function (event) {
  let is_active = document.getElementById('data_collecting_is_active');
  let alarm_fqdn = document.getElementById('data_collecting_alarm_fqdn');
  let ping_fqdn = document.getElementById('data_collecting_ping_fqdn');
  let ping_packets = document.getElementById('data_collecting_ping_packets');
  [alarm_fqdn, ping_fqdn].forEach((input) => input.setCustomValidity(''));

  let fqdnErrorMsg = 'Insira um endereço válido';
  if (!isFqdnValid(alarm_fqdn.value)) alarm_fqdn.setCustomValidity(fqdnErrorMsg);
  if (!isFqdnValid(ping_fqdn.value)) ping_fqdn.setCustomValidity(fqdnErrorMsg);

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
    sendDataCollectingParameters(data, form, 'Parâmeteros salvos.');
  }
  return false;
};

let validateUpdateManyParameters = function (event) {
  let is_active = document.getElementById('data_collecting_mass_update_is_active');
  let has_latency = document.getElementById('data_collecting_mass_update_has_latency');
  let ping_fqdn = document.getElementById('data_collecting_mass_update_ping_fqdn');
  [ping_fqdn].forEach((input) => input.setCustomValidity(''))

  // defining boolean set statements. we never unset boolean parameters.
  let data = {}
  let anyChange = false
  let booleanFields = { // these are not check boxes. values can be true, false or no change.
    is_active: is_active.value,
    has_latency: has_latency.value
  };
  for (let fieldname in booleanFields) {
    let value = booleanFields[fieldname];
    if (value === '') continue;
    if (value === "True") value = true;
    else if (value === "False") value = false;
    if (data.$set === undefined) data.$set = {};
    data.$set[fieldname] = value;
    anyChange = true;
  }

  // defining ping_fqdn set or unset statement.
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
      let msg = `Parâmeteros salvos em ${totalDevicesFromSearch} dispositivo${plural}.` 
      sendDataCollectingParameters(data, form, msg, true);
    }
  } else {
    hideModalShowAllert($('#data_collecting'), 'Nada a ser alterado', 'danger');
  }
  return false;
};

// the search value when the search was submitted. As it starts empty, we can initialize this variable as empty.
let lastDevicesSearchInputQuery = '';
let totalDevicesFromSearch = 0;

$(document).ready(function() {
  [...document.getElementsByClassName('panel-arrow')].forEach((e) => e.addEventListener("click", hideShowPannel))
  document.getElementById("data_collecting_serviceForm").addEventListener('submit', validateServiceParameters);
  document.getElementById("data_collecting_updateManyForm").addEventListener('submit', validateUpdateManyParameters);
  document.getElementById("devices-search-form").addEventListener('submit', () => {
    // when a search is submitted, we save the value that was in the search input.
    lastDevicesSearchInputQuery = document.getElementById('devices-search-input').value;
    return false;
  });
});