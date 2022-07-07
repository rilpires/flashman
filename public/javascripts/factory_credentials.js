import {anlixDocumentReady} from '../src/common.index.js';
import {} from './session_storage.js';

let credentialsInfo = [];
let vendorsAndModelsMap = {};
let selectedVendor = '';
let selectedModel = '';

const getCallback = function(event) {
  $.ajax({
    type: 'GET',
    url: '/factory_credentials/get',
    dataType: 'json',
    success: function(res) {
      if (res.success) {
        if (res.credentials) {
          // Get credentials info
          credentialsInfo = Array.from(res.credentials.credentials);
          buildMappingTable();
        }
        if (res.vendors_info) {
          // Build vendors and models dropdowns
          vendorsAndModelsMap = Object(res.vendors_info);
          buildVendorDropdown(vendorsAndModelsMap);
          buildModelDropdown(vendorsAndModelsMap);
        }
      } else {
        // Show a modal warning
        swal({
          type: res.type,
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
    data: JSON.stringify({credentials: credentialsInfo}),
    contentType: 'application/json',
    success: function(res) {
      // Show a modal warning
      swal({
        type: res.type,
        title: res.message,
        confirmButtonColor: '#4db6ac',
      });
    },
  });
};

// Triggers
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
    credentialsInfo = [];
    $('#factory-credentials-table').empty();
  });

  // Dropdown of vendors
  $(document).on('change', '#factory-credentials-vendor-entries',
    function(event) {
      selectedVendor = $('#factory-credentials-vendor-entries').val();
      // We must rebuild the models dropdown for each selected vendor
      buildModelDropdown(vendorsAndModelsMap);
    },
  );

  // Dropdown of entries
  $(document).on('change', '#factory-credentials-model-entries',
    function(event) {
      selectedModel = $('#factory-credentials-model-entries').val();
    },
  );

  // Button that adds the credentials that are on the input fields to the
  // front-end table
  $(document).on('click', '#factory-credentials-add-button',
    function(event) {
      const username = $('#factory-credentials-user-input').val();
      const password = $('#factory-credentials-password-input').val();
      if (!username || username == '') {
        // Show a modal warning
        swal({
          type: 'error',
          title: 'Usuário não pode ser um campo vazio',
          confirmButtonColor: '#4db6ac',
        });
      } else if (!password || password == '') {
        // Show a modal warning
        swal({
          type: 'error',
          title: 'Senha não pode ser um campo vazio',
          confirmButtonColor: '#4db6ac',
        });
      } else if (
        // If the user has already defined a preset for the selected model,
        // then we must not allow the user to set a new preset for this model
        credentialsInfo.filter((item) => item.model == selectedModel).length > 0
      ) {
        // Show a modal warning
        swal({
          type: 'error',
          title: 'O modelo ' + selectedModel +
                 ' já tem credenciais configuradas',
          confirmButtonColor: '#4db6ac',
        });
      } else {
        buildTableLine({
          vendor: selectedVendor,
          model: selectedModel,
          username: username,
          password: password,
        });
        credentialsInfo.push({
          vendor: selectedVendor,
          model: selectedModel,
          username: username,
          password: password,
        });
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

  selectedVendor = $('#factory-credentials-vendor-entries').val();
};

// Builds the models dropdown at the front-end
let buildModelDropdown = function(resp) {
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

  selectedModel = $('#factory-credentials-model-entries').val();
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
          .html('<b>Usuário:</b> ' + credential.username),
        ),
        // Password column
        $('<td>')
        .addClass('text-left')
        .append(
          $('<span>')
          .css('display', 'block')
          .html('<b>Senha:</b> ' + credential.password),
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

  // For each credential config, we must build a line on the table
  for (let i = 0; i < credentialsInfo.length; i++) {
    buildTableLine(credentialsInfo[i]);
  }
};

window.removeCredentialsFromTable = function(input) {
  let credentialsTable = $('#factory-credentials-table');
  let id = input.dataset['id'];

  // Update the credentialsInfo array only with credentials
  // that has an id different from the one that we are removing
  credentialsInfo = credentialsInfo.filter((item) => {
    return (item.vendor + ' ' + item.model) != id;
  });
  // Removing the credential config line from the fron-end table
  credentialsTable.find('[data-id="' + id + '"]').remove();
};
