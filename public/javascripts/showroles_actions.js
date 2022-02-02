/* eslint require-jsdoc: 0 */
import {displayAlertMsg} from './common_actions.js';

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
                         .text('Permissões do cadastro e ações nas CPEs'),
                $('<hr>').addClass('my-1'),
                $('<div>').addClass('row mb-3')
                .append(
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>').text('Informações do WiFi'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-wifi-info').append(
                          $('<option>').val(0)
                          .text('Não visualizar'),
                          $('<option>').val(1)
                          .text('Visualizar'),
                          $('<option>').val(2)
                          .text('Visualizar e editar'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>').text('Informações do PPPoE'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-pppoe-info').append(
                          $('<option>').val(0)
                          .text('Não visualizar'),
                          $('<option>').val(1)
                          .text('Visualizar'),
                          $('<option>').val(2)
                          .text('Visualizar e editar'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Visualização de Senhas ao Editar'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-pass-show').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle da rede LAN'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-lan-edit').append(
                          $('<option>').val(false)
                          .text('Visualizar'),
                          $('<option>').val(true)
                          .text('Visualizar e editar'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle de bloqueio de Internet nos dispositivos'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-lan-devices-block').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle de Modo de Operação'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-opmode-edit').append(
                          $('<option>').val(false).text('Visualizar'),
                          $('<option>').val(true).text('Visualizar e editar'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Desassociação de secundário no mesh'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-slave-disassociate').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle de Identificação do CPE'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-device-id').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle de Ações no CPE'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-device-actions').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Acesso aos Logs dos CPEs'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-log-access').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Mostrar Alertas em CPEs'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-notification-popups').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Informações Sobre Dispositivos Conectados'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-lan-devices').append(
                          $('<option>').val(0)
                          .text('Não visualizar'),
                          $('<option>').val(1)
                          .text('Visualizar'),
                          $('<option>').val(2)
                          .text('Visualizar e realizar ações'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Informações Sobre Redes ao Redor'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-site-survey').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Acesso a gráficos de tráfego na WAN'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-wan-bytes').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Voltar CPE para a Firmware de Fábrica'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-factory-reset').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Remoção de Registro de CPE'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-device-removal').append(
                          $('<option>').val(0).text('Bloquear'),
                          $('<option>').val(1).text('Permitir'),
                          $('<option>').val(2).text('Permitir em massa'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Adição de Registro de CPE'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-device-add').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Informações de VLANs'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-vlan').append(
                          $('<option>').val(0).text('Não Visualizar'),
                          $('<option>').val(1).text('Visualizar'),
                          $('<option>').val(2).text('Visualizar e Editar'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Informações Sobre Medição de Velocidade'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-measure-devices').append(
                          $('<option>').val(0)
                          .text('Não visualizar'),
                          $('<option>').val(1)
                          .text('Visualizar'),
                          $('<option>').val(2)
                          .text('Visualizar e realizar ações'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle do Tipo de Conexão'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-wan-type').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                  ),
                ),
                $('<h5>').addClass('text-muted mb-0 mt-3')
                         .text('Permissões de atualização de firmware'),
                $('<hr>').addClass('my-1'),
                $('<div>').addClass('row mb-3')
                .append(
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle de Atualização de Firmware'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-firmware-upgrade').append(
                          $('<option>').val(0).text('Bloquear'),
                          $('<option>').val(1).text('Permitir'),
                          $('<option>').val(2).text('Permitir em massa'),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle de Atualização de Firmware Restrita'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-firmware-restricted-upgrade')
                        .append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle de Gerência de Firmwares'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-firmware-manage').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle de Atualização de Firmware Beta'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-firmware-beta-upgrade').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                  ),
                ),
                $('<h5>').addClass('text-muted mb-0 mt-3')
                         .text('Permissões gerais do Flashman'),
                $('<hr>').addClass('my-1'),
                $('<div>').addClass('row mb-3')
                .append(
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Total sobre status de CPEs'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-search-summary').append(
                          $('<option>').val(false).text('Não visualizar'),
                          $('<option>').val(true).text('Visualizar'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Permitir Acesso a API REST'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-api-access').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle de Configurações do Flashman'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-flashman-manage').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Controle de Gerência de Usuários'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-user-manage').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Configuração de parâmetros do TR-069'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-monitor-manage').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Acesso às Certificações de CPEs'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-certification-access').append(
                          $('<option>').val(0)
                          .text('Não visualizar'),
                          $('<option>').val(1)
                          .text('Visualizar'),
                          $('<option>').val(2)
                          .text('Visualizar e editar'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Busca de CPEs'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-search-level').append(
                          $('<option>').val(0)
                          .text('Não permitir busca e visualização'),
                          $('<option>').val(1)
                          .text('Busca simples'),
                          $('<option>').val(2)
                          .text('Busca completa com filtros especiais'),
                        ),
                      ),
                    ),
                  ),
                  $('<div>').addClass('col-12 col-lg-4').append(
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Exportação de cadastros por CSV'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-csv-export').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Adição/Edição/Remoção de Perfis de VLANs'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-vlan-profile-edit').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
                        ),
                      ),
                    ),
                    $('<div>').addClass('md-form').append(
                      $('<div>')
                      .addClass('md-selectfield form-control my-0').append(
                        $('<label>')
                        .text('Acesso ao App do Técnico'),
                        $('<select>')
                        .addClass('browser-default md-select')
                        .attr('name', 'grant-diag-app-access').append(
                          $('<option>').val(false).text('Bloquear'),
                          $('<option>').val(true).text('Permitir'),
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
                        $('<span>').html('&nbsp Editar'),
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
        $(rowObj).find('[name=grant-wan-bytes] option[value=' +
          roleObj.grantWanBytesView + ']')
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
