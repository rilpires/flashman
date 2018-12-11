
let notificationActionsScript = document.currentScript;

let changeDeviceStatusOnTable = function(macaddr, data) {
  let deviceOnTable = $('#' + $.escapeSelector(macaddr));
  if (deviceOnTable.length) {
    if (data == 'online' || data == 'recovery') {
      let status = deviceOnTable.find('.device-status');
      let currentGreen = status.hasClass('green-text');
      let currentRed = status.hasClass('red-text');
      if (currentGreen) {
        $('#online-status-sum').text(
          parseInt($('#online-status-sum').text()) - 1);
      } else if (currentRed) {
        $('#recovery-status-sum').text(
          parseInt($('#recovery-status-sum').text()) - 1);
      } else {
        $('#offline-status-sum').text(
          parseInt($('#offline-status-sum').text()) - 1);
      }
      if (data == 'online') {
        $('#online-status-sum').text(
          parseInt($('#online-status-sum').text()) + 1);
      } else if (data == 'recovery') {
        $('#recovery-status-sum').text(
          parseInt($('#recovery-status-sum').text()) + 1);
      }
      status.removeClass('green-text red-text grey-text').addClass(data);
    } else {
      let alert = deviceOnTable.find('.device-alert');
      let alertLink = alert.parent();
      alertLink.removeClass('d-none');
      alertLink.off('click').click(function(event) {
        swal({
          type: 'warning',
          text: data.message,
          confirmButtonText: data.action_title,
          confirmButtonColor: '#4db6ac',
          cancelButtonText: 'Cancelar',
          cancelButtonColor: '#f2ab63',
          showCancelButton: true,
        }).then(function(result) {
          alertLink.addClass('d-none');
          if (result.value) {
            $.ajax({
              type: 'POST',
              url: data.action_url,
              traditional: true,
            });
          }
          $.ajax({
            type: 'POST',
            url: '/notification/del',
            traditional: true,
            data: {id: data._id},
          });
        });
      });
    }
  }
};

$(document).ready(function() {
  // Enable device status notification reception
  $.ajax({
    url: '/notification/register/devicestatus',
    type: 'POST',
    dataType: 'json',
    error: function(xhr, status, error) {
      displayAlertMsg(JSON.parse(xhr.responseText));
    },
  });
  // Fetch existing notifications
  $.ajax({
    url: '/notification/fetch',
    type: 'POST',
    traditional: true,
    data: {
      devices: notificationActionsScript.getAttribute('devices').split(','),
    },
    success: function(res) {
      res.notifications.forEach((notification) => {
        changeDeviceStatusOnTable(notification.target, notification);
      });
    },
    error: function(xhr, status, error) {
      displayAlertMsg(JSON.parse(xhr.responseText));
    },
  });
  // Important: include and initialize socket.io first using socket var
  // Actions when a status change is received
  socket.on('DEVICESTATUS', function(macaddr, data) {
    changeDeviceStatusOnTable(macaddr, data);
  });
});
