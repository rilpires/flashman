/* eslint-disable no-prototype-builtins */
/* global __line */

import {anlixDocumentReady} from '../src/common.index.js';
import {
  setFactoryCredentialsStorage,
  getFactoryCredentialsStorage,
} from './session_storage.js';

const t = i18next.t;

const getCallback = function(event) {
  $.ajax({
    type: 'GET',
    url: '/factory_credentials/get',
    dataType: 'json',
    success: function(res) {
      if (res.success) {
        if (res.credentials) {
          // Get credentials info
          setFactoryCredentialsStorage(
            'credentialsInfo', res.credentials.credentials,
          );
          buildMappingTable();
          factoryCredentialsTableToggle();
        }
        if (res.vendors_info) {
          // Build vendors and models dropdowns
          let vendorsAndModelsMap = Object(res.vendors_info);
          setFactoryCredentialsStorage(
            'vendorsAndModelsMap', vendorsAndModelsMap,
          );
          buildVendorDropdown(vendorsAndModelsMap);
          buildModelDropdown(vendorsAndModelsMap);
        }
      } else {
        // Show a modal warning
        swal.fire({
          icon: (res.type === 'danger') ? 'warning' : res.type,
          title: res.message,
          confirmButtonColor: '#4db6ac',
        });
      }
    },
  });
};

const setCallback = function(event) {
  $.ajax({
    type: 'POST',
    url: '/factory_credentials/set',
    dataType: 'json',
    data: JSON.stringify({
      credentials: getFactoryCredentialsStorage('credentialsInfo'),
    }),
    contentType: 'application/json',
    success: function(res) {
      // Show a modal warning
      swal.fire({
        icon: (res.type === 'danger') ? 'warning' : res.type,
        title: res.message,
        confirmButtonColor: '#4db6ac',
      });
    },
  });
};

const factoryCredentialsTableToggle = function() {
  if (getFactoryCredentialsStorage('credentialsInfo').length > 0) {
    $('#factory-credentials-table-none').hide();
    $('#factory-credentials-table').show();
  } else if (getFactoryCredentialsStorage('credentialsInfo').length == 0) {
    $('#factory-credentials-table-none').show();
    $('#factory-credentials-table').hide();
  }
};

// Triggers for the web components
anlixDocumentReady.add(function() {
  // Button that opens the credentials configuration modal
  $(document).on('click', '#factory-credentials-button', (event) =>
    getCallback(event));

  // Button that sends the credentials that exists on the front-end table
  // to the back-end
  $(document).on('click', '#factory-credentials-submit-button', (event) =>
    setCallback(event));

  // Button that removes all the credentials from the array and front-end table
  $(document).on('click', '#factory-credentials-remove-all', function(event) {
    // Storing credentials info array to a empty array
    setFactoryCredentialsStorage('credentialsInfo', []);
    // Cleaning the front-end table
    $('#factory-credentials-table').empty();
    factoryCredentialsTableToggle();
  });

  // Dropdown of vendors
  $(document).on('change', '#factory-credentials-vendor-entries',
    function(event) {
      // Storing selected vendor with the value of the dropdown
      setFactoryCredentialsStorage(
        'selectedVendor', $('#factory-credentials-vendor-entries').val(),
      );
      // We must rebuild the models dropdown for each selected vendor
      buildModelDropdown(getFactoryCredentialsStorage('vendorsAndModelsMap'));
    },
  );

  // Dropdown of entries
  $(document).on('change', '#factory-credentials-model-entries',
    function(event) {
      // Storing selected model with the value of the dropdown
      setFactoryCredentialsStorage(
        'selectedModel', $('#factory-credentials-model-entries').val(),
      );
    },
  );

  // Button that adds the credentials that are on the input fields to the
  // front-end table
  $(document).on('click', '#factory-credentials-add-button',
    function(event) {
      let selectedVendor = $('#factory-credentials-vendor-entries').val();
      let selectedModel = $('#factory-credentials-model-entries').val();

      // Storing selected model and vendor with the values of the dropdowns
      setFactoryCredentialsStorage('selectedVendor', selectedVendor);
      setFactoryCredentialsStorage('selectedModel', selectedModel);

      let credentialsInfo = getFactoryCredentialsStorage('credentialsInfo');

      const username = $('#factory-credentials-user-input').val();
      const password = $('#factory-credentials-password-input').val();

      if (!username || username === '') {
        // Show a modal warning
        swal.fire({
          icon: 'error',
          title: t('emptyUserError'),
          confirmButtonColor: '#4db6ac',
        });
      } else if (!password || password === '') {
        // Show a modal warning
        swal.fire({
          icon: 'error',
          title: t('emptyPasswordError'),
          confirmButtonColor: '#4db6ac',
        });
      } else if (
        // If the user has already defined a preset for the selected model,
        // then we must not allow the user to set a new preset for this model
        credentialsInfo.filter((item) => item.model == selectedModel).length > 0
      ) {
        // Show a modal warning
        swal.fire({
          icon: 'error',
          title: t('duplicatedCredentials', {model: selectedModel}),
          confirmButtonColor: '#4db6ac',
        });
      } else {
        let newCredential = {
          vendor: selectedVendor, model: selectedModel,
          username: username, password: password,
        };
        // Build new table line for the new credential
        buildTableLine(newCredential);
        // Set storaged credentials info adding the new credential
        credentialsInfo.push(newCredential);
        setFactoryCredentialsStorage('credentialsInfo', credentialsInfo);
        // Clear inputs
        $('#factory-credentials-user-input').val('');
        $('#factory-credentials-password-input').val('');
        factoryCredentialsTableToggle();
      }
    },
  );
});

// Builds the vendors dropdown at the front-end
let buildVendorDropdown = function(resp) {
  let vendors = Array.from(Object.keys(resp));
  let vendorsDropdown = $('#factory-credentials-vendor-entries');

  for (let i = 0; i < vendors.length; i++) {
    vendorsDropdown.append(
      $('<option>')
      .attr('value', vendors[i])
      .html(vendors[i]),
    );
  }

  // Setting stored selected vendor with the new value at the dropdown
  setFactoryCredentialsStorage(
    'selectedVendor', $('#factory-credentials-vendor-entries').val(),
  );
};

// Builds the models dropdown at the front-end
let buildModelDropdown = function(resp) {
  let selectedVendor = getFactoryCredentialsStorage('selectedVendor');
  let models = Object(resp)[selectedVendor];
  let modelsDropdown = $('#factory-credentials-model-entries');
  modelsDropdown.empty();

  for (let i = 0; i < models.length; i++) {
    modelsDropdown.append(
      $('<option>')
      .attr('value', models[i])
      .html(models[i]),
    );
  }

  // Storing selected model with the value of the dropdown
  setFactoryCredentialsStorage(
    'selectedModel', $('#factory-credentials-model-entries').val(),
  );
};

const buildTableLine = function(credential) {
  let credentialsTable = $('#factory-credentials-table');
  let id = credential.vendor + ' ' + credential.model;
  credentialsTable.append(
      $('<tr>').append(
        // Vendor and model column
        $('<td>')
        .addClass('text-left')
        .append(
          $('<span>')
          .css('display', 'block')
          .html(id),
        ),
        // User column
        $('<td>')
        .addClass('text-left')
        .append(
          $('<span>')
          .css('display', 'block')
          .html('<b>'+ t('User') +':</b> '+ credential.username),
        ),
        // Password column
        $('<td>')
        .addClass('text-left')
        .append(
          $('<span>')
          .css('display', 'block')
          .html('<b>'+ t('Password') +':</b> ' + credential.password),
        ),
        // Remove entry column
        $('<td>')
          .addClass('text-right')
          .append(
            $('<button>')
            .append(
              $('<div>')
              .addClass('fas fa-times fa-lg'),
            )
            .addClass('btn btn-sm btn-danger my-0 mr-0')
            .attr('type', 'button')
            .attr('onclick', 'removeCredentialsFromTable(this)')
            .attr('data-id', id),
          ),
      )
      .addClass('bounceIn')
      .attr('data-id', id),
    );
};

let buildMappingTable = function() {
  // Clear credentials table
  $('#factory-credentials-table').empty();
  let credentialsInfo = getFactoryCredentialsStorage('credentialsInfo');
  // For each credential config, we must build a line on the table
  for (let i = 0; i < credentialsInfo.length; i++) {
    buildTableLine(credentialsInfo[i]);
  }
};

window.removeCredentialsFromTable = function(input) {
  let credentialsTable = $('#factory-credentials-table');
  let id = input.dataset['id'];

  // Update the credentials info array only with credentials
  // that has an id different from the one that we are removing
  let newCredentialsInfo =
    getFactoryCredentialsStorage('credentialsInfo')
    .filter(
      (item) => ((item.vendor + ' ' + item.model) != id),
    );
  // Storing new credentials info array without the removed credentials
  setFactoryCredentialsStorage('credentialsInfo', newCredentialsInfo);
  // Removing the credential config line from the fron-end table
  credentialsTable.find('[data-id="' + id + '"]').remove();
  factoryCredentialsTableToggle();
};
