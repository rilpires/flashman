/* eslint require-jsdoc: 0 */
import {displayAlertMsg} from './common_actions.js';
import {anlixDocumentReady} from '../src/common.index.js';

const t = i18next.t;

anlixDocumentReady.add(function() {
  let selectedItens = [];
  let selectedNames = [];

  $(document).on('click', '#card-header', function() {
    let plus = $(this).find('.fa-plus');
    let cross = $(this).find('.fa-times');
    plus.removeClass('fa-plus').addClass('fa-times');
    cross.removeClass('fa-times').addClass('fa-plus');
  });

  $(document).on('click', '#btn-roles-trash', function(event) {
    $.ajax({
      type: 'POST',
      url: '/user/role/del',
      traditional: true,
      data: {ids: selectedItens, names: selectedNames},
      success: function(res) {
        if (res.type == 'success') {
          displayAlertMsg(res);
          setTimeout(function() {
            window.location.reload();
          }, 1000);
        } else {
          displayAlertMsg(res);
        }
      },
    });
  });

  $(document).on('change', '.checkbox', function(event) {
    let itemId = $(this).prop('id');
    let itemName = $(this).data('name');
    if (itemId == 'checkall') {
      $('.checkbox').not(this).prop('checked', this.checked).change();
    } else {
      let itemIdx = selectedItens.indexOf(itemId);
      if ($(this).is(':checked')) {
        if (itemIdx == -1) {
          selectedItens.push(itemId);
          selectedNames.push(itemName);
        }
      } else {
        if (itemIdx != -1) {
          selectedItens.splice(itemIdx, 1);
          selectedNames.splice(itemIdx, 1);
        }
      }
    }
  });

  // Handle new roles and roles edition
  function handleFormSubmit(event) {
    if ($(this)[0].checkValidity()) {
      $.post($(this).attr('action'), $(this).serialize(), function(res) {
        displayAlertMsg(res);
        if (res.type == 'success') {
          setTimeout(function() {
            window.location.reload();
          }, 2000);
        }
      }, 'json');
    } else {
      event.preventDefault();
      event.stopPropagation();
    }
    $(this).addClass('was-validated');
    return false;
  }

  $(document).on('submit', '.edit-role-form', handleFormSubmit);
  $('#new-role-form').submit(handleFormSubmit);

  $.get('/user/role/get/all', function(res) {
    if (res.type == 'success') {
      $('#loading-roles').hide();
      $('#roles-table-wrapper').show();

      res.roles.forEach(function(roleObj) {
        let rowObj = null;
        $('#roles-table-content').append(
          $('<tr>').append(
            $('<td>').addClass('col-xs-1').append(
              $('<input>').addClass('checkbox')
              .attr('type', 'checkbox')
              .attr('id', roleObj._id)
              .attr('data-name', roleObj.name),
            ),
            $('<td>').addClass('text-center').html(roleObj.name),
            $('<td>').addClass('text-center col-xs-1 colapse')
              .attr('style', 'cursor: pointer;').append(
                $('<div>').addClass('fas fa-chevron-down fa-lg colapse'),
            ),
          ),
          // form row
          rowObj = $('<tr>').attr('style', 'display: none;').append(
            $('<td>').addClass('grey lighten-5').attr('colspan', '3')
            .append(
              $('<form>').addClass('needs-validation')
              .addClass('edit-role-form')
              .attr('novalidate', 'true')
              .attr('method', 'post')
              .attr('action', '/user/role/edit/' + roleObj._id)
              .append(
                $('<h5>').addClass('text-muted mb-0 mt-3')
                         .text(t('registerPermissionsAndActionsInCpes')),
                $('<hr>').addClass('my-1'),
                $('<div>').addClass('row mb-3')
                .append(
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>').text(t('wifiInformation')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-wifi-info').append(
                          $('<option>').val(0)
                          .text(t('cannotView')),
                          $('<option>').val(1)
                          .text(t('View')),
                          $('<option>').val(2)
                          .text(t('viewAndEdit')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>').text(t('pppoeInformation')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-pppoe-info').append(
                          $('<option>').val(0)
                          .text(t('cannotView')),
                          $('<option>').val(1)
                          .text(t('View')),
                          $('<option>').val(2)
                          .text(t('viewAndEdit')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('viewPasswordWhenEditing')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-pass-show').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('lanNetworkControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-lan-edit').append(
                          $('<option>').val(false)
                          .text(t('View')),
                          $('<option>').val(true)
                          .text(t('viewAndEdit')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('internetInDevicesBlockingControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-lan-devices-block').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('operationModeControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-opmode-edit').append(
                          $('<option>').val(false).text(t('View')),
                          $('<option>').val(true).text(t('viewAndEdit')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('meshSecondaryDisassociation')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-slave-disassociate').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('cpeIdentificationControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-device-id').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('actionsInCpeControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-device-actions').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('accessCpeLogs')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-log-access').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('showCpeAlerts')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-notification-popups').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('connectedDevicesInformation')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-lan-devices').append(
                          $('<option>').val(0)
                          .text(t('cannotView')),
                          $('<option>').val(1)
                          .text(t('View')),
                          $('<option>').val(2)
                          .text(t('viewAndMakeActions')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('neighboringNetworksInformation')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-site-survey').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('wanTrafficPlotsAccess')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-statistics').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('returnCpeToFactoryFirmware')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-factory-reset').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('cpesRegistersRemoval')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-device-removal').append(
                          $('<option>').val(0).text(t('Block')),
                          $('<option>').val(1).text(t('Allow')),
                          $('<option>').val(2).text(t('allowMany')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('cpeLicenseBlockAtRemoval')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-block-license-at-removal').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('cpesRegistersAddition')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-device-add').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('vlanInformation')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-vlan').append(
                          $('<option>').val(0).text(t('cannotView')),
                          $('<option>').val(1).text(t('View')),
                          $('<option>').val(2).text(t('viewAndEdit')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('speedTestInformation')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-measure-devices').append(
                          $('<option>').val(0)
                          .text(t('cannotView')),
                          $('<option>').val(1)
                          .text(t('View')),
                          $('<option>').val(2)
                          .text(t('viewAndMakeActions')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('connectionTypeControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-wan-type').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                  ),
                ),
                $('<h5>').addClass('text-muted mb-0 mt-3')
                         .text(t('firmwareUpdatePermissions')),
                $('<hr>').addClass('my-1'),
                $('<div>').addClass('row mb-3')
                .append(
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('firmwareUpdateControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-firmware-upgrade').append(
                          $('<option>').val(0).text(t('Block')),
                          $('<option>').val(1).text(t('Allow')),
                          $('<option>').val(2).text(t('allowMany')),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('restrictedFirmwareUpdateControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-firmware-restricted-upgrade')
                        .append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('firmwareManagementControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-firmware-manage').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('betaFirmwareUpdateControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-firmware-beta-upgrade').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                  ),
                ),
                $('<h5>').addClass('text-muted mb-0 mt-3')
                         .text(t('generalFlashmanPermissions')),
                $('<hr>').addClass('my-1'),
                $('<div>').addClass('row mb-3')
                .append(
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('cpeStatusTotal')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-search-summary').append(
                          $('<option>').val(false).text(t('cannotView')),
                          $('<option>').val(true).text(t('View')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('allowRestApiAccess')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-api-access').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('flashmanConfigurationsControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-flashman-manage').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('rowsPerPage')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-rows-per-page').append(
                          $('<option>').val(false).text(t('cannotView')),
                          $('<option>').val(true).text(t('View')),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('userManagementControl')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-user-manage').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('tr069ParametersConfiguration')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-monitor-manage').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('cpeCertificatesAccess')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-certification-access').append(
                          $('<option>').val(0)
                          .text(t('cannotView')),
                          $('<option>').val(1)
                          .text(t('View')),
                          $('<option>').val(2)
                          .text(t('viewAndEdit')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('cpeSearch')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-search-level').append(
                          $('<option>').val(0)
                          .text(t('cannotSearchAndView')),
                          $('<option>').val(1)
                          .text(t('simpleSearch')),
                          $('<option>').val(2)
                          .text(t('completeSearchWithSpecialFilters')),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('csvRegisterExport')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-csv-export').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('vlanProfilesAdditionEditionRemoval')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-vlan-profile-edit').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text(t('technicianAppAccess')),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-diag-app-access').append(
                          $('<option>').val(false).text(t('Block')),
                          $('<option>').val(true).text(t('Allow')),
                        ),
                      ),
                    ),
                  ),
                ),
                $('<div>').addClass('row')
                .attr('style', 'margin: 0px;')
                .append(
                  $('<div>').addClass('col text-center').append(
                    $('<div>').addClass('form-buttons').append(
                      $('<button>').addClass('btn btn-primary')
                      .attr('type', 'submit')
                      .append(
                        $('<div>').addClass('fas fa-check'),
                        $('<span>').html('&nbsp '+t('Edit')),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        // Mark selected options
        $(rowObj).find('[name=grant-wifi-info] option[value=' +
          roleObj.grantWifiInfo + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-pppoe-info] option[value=' +
          roleObj.grantPPPoEInfo + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-pass-show] option[value=' +
          roleObj.grantPassShow + ']')
        .attr('selected', 'selected');
        let basicFirmwareUpgrade = roleObj.grantFirmwareUpgrade;
        let massFirmwareUpgrade = roleObj.grantMassFirmwareUpgrade;
        let fwUpgradeValue = 0;
        if (basicFirmwareUpgrade && massFirmwareUpgrade) {
          fwUpgradeValue = 2;
        } else if (basicFirmwareUpgrade && !massFirmwareUpgrade) {
          fwUpgradeValue = 1;
        }
        $(rowObj).find('[name=grant-firmware-upgrade] option[value=' +
          fwUpgradeValue + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-wan-type] option[value=' +
          roleObj.grantWanType + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-opmode-edit] option[value=' +
          roleObj.grantOpmodeEdit + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-slave-disassociate] option[value=' +
          roleObj.grantSlaveDisassociate + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-device-id] option[value=' +
          roleObj.grantDeviceId + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-device-actions] option[value=' +
          roleObj.grantDeviceActions + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-factory-reset] option[value=' +
          roleObj.grantFactoryReset + ']')
        .attr('selected', 'selected');
        let basicDeviceRemoval = roleObj.grantDeviceRemoval;
        let massDeviceRemoval = roleObj.grantDeviceMassRemoval;
        let deviceRemovalValue = 0;
        if (basicDeviceRemoval && massDeviceRemoval) {
          deviceRemovalValue = 2;
        } else if (basicDeviceRemoval && !massDeviceRemoval) {
          deviceRemovalValue = 1;
        }
        $(rowObj).find('[name=grant-device-removal] option[value=' +
          deviceRemovalValue + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-block-license-at-removal] option[value=' +
          roleObj.grantDeviceLicenseBlock + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-device-add] option[value=' +
          roleObj.grantDeviceAdd + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-monitor-manage] option[value=' +
          roleObj.grantMonitorManage + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-firmware-manage] option[value=' +
          roleObj.grantFirmwareManage + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-user-manage] option[value=' +
          roleObj.grantUserManage + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-flashman-manage] option[value=' +
          roleObj.grantFlashmanManage + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-api-access] option[value=' +
          roleObj.grantAPIAccess + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-diag-app-access] option[value=' +
          roleObj.grantDiagAppAccess + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-certification-access] option[value=' +
          roleObj.grantCertificationAccess + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-log-access] option[value=' +
          roleObj.grantLOGAccess + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-notification-popups] option[value=' +
          roleObj.grantNotificationPopups + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-lan-edit] option[value=' +
          roleObj.grantLanEdit + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-lan-devices-block] option[value=' +
          roleObj.grantLanDevicesBlock + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-lan-devices] option[value=' +
          roleObj.grantLanDevices + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-site-survey] option[value=' +
          roleObj.grantSiteSurvey + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-measure-devices] option[value=' +
          roleObj.grantMeasureDevices + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-csv-export] option[value=' +
          roleObj.grantCsvExport + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-statistics] option[value=' +
          roleObj.grantStatisticsView + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-vlan] option[value=' +
          roleObj.grantVlan + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-vlan-profile-edit] option[value=' +
          roleObj.grantVlanProfileEdit + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-search-level] option[value=' +
          roleObj.grantSearchLevel + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-search-summary] option[value=' +
          roleObj.grantShowSearchSummary + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-rows-per-page] option[value=' +
          roleObj.grantShowRowsPerPage + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-firmware-beta-upgrade] option[value=' +
          roleObj.grantFirmwareBetaUpgrade + ']')
        .attr('selected', 'selected');
        $(rowObj).find('[name=grant-firmware-restricted-upgrade] option[value='+
          roleObj.grantFirmwareRestrictedUpgrade + ']')
        .attr('selected', 'selected');
      });
    } else {
      displayAlertMsg({
        type: res.type,
        message: res.message,
      });
    }
  }, 'json');

  $(document).on('click', '.colapse', function(event) {
    let formRow = $(event.target).parents('tr').next();

    if ($(this).children().hasClass('fa-chevron-down')) {
      formRow.show('fast');
      $(this).find('.fa-chevron-down')
        .removeClass('fa-chevron-down')
        .addClass('fa-chevron-up text-primary');
    } else if ($(this).children().hasClass('fa-chevron-up')) {
      formRow.hide('fast');
      $(this).find('.fa-chevron-up')
        .removeClass('fa-chevron-up text-primary')
        .addClass('fa-chevron-down');
    }
  });
});
