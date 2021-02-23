
const displayAlertMsg = function(res) {
  $('#frame-modal-alert .modal-dialog').removeClass(
    'modal-success modal-danger');
  $('#frame-modal-alert .modal-dialog').addClass('modal-' + res.type);
  $('#frame-modal-alert .alert-message').html(res.message);
  $('#frame-modal-alert').modal('show');
};

const secondsTimeSpanToHMS = function(s) {
  let h = Math.floor(s / 3600); // Get whole hours
  s -= h * 3600;
  let m = Math.floor(s / 60); // Get remaining minutes
  s -= m * 60;
  return h + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
};

let fetchNotifications = function() {
  $.ajax({type: 'POST',
          url: '/notification/fetch',
          traditional: true,
          data: {targets: ['general']}})
  .done((response) => {
    let alertsBody = $('#alerts-flashman-body');
    if (response.notifications.length > 0) {
      for (let notification of response.notifications) {
        alertsBody.append(
          $('<div>').addClass('row mb-3').append(
            $('<div>').addClass('card w-100').append(
              $('<div>').addClass('card-body text-center').append(
                $('<p>').text(notification.message),
              ),
            ),
          ),
        );
      }
      $('.bell-notification').addClass('swing infinite');
      $('.bell-counter').attr('count', response.notifications.length);
      $('.bell-counter').show();
    }
  });
};

$(document).ready(function() {
  if (!window.location.href.includes('/login')) {
    fetchNotifications();
  }
});
