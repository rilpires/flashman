import {anlixDocumentReady} from '../src/common.index.js';
import 'bootstrap/js/src/modal';
import {io} from 'socket.io-client';

const t = i18next.t;
const socket = io({transports: ['websocket']});

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
    alertsBody.empty();
    $('.bell-notification').removeClass('swing infinite');
    $('.bell-counter').hide();
    if (response.notifications.length > 0) {
      for (let notification of response.notifications) {
        let icon = 'fa-exclamation-triangle';
        let iconText = 'Atenção';
        let msgColor = 'text-warning';
        let btnText = (notification.action_title ?
                       notification.action_title : 'Entendi');
        if (notification.severity == 'info') {
          icon = 'fa-info-circle';
          iconText = 'Informação';
          msgColor = 'text-info';
        } else if (notification.severity == 'danger') {
          icon = 'fa-exclamation-circle';
          iconText = 'Perigo';
          msgColor = 'text-danger';
        }
        alertsBody.append(
          $('<div>').addClass('row mb-3').append(
            $('<div>').addClass('card w-100 grey lighten-4').append(
              $('<div>').addClass('card-body p-2').append(
                $('<div>').addClass('card-title mt-2 text-center ' + msgColor)
                .append(
                  $('<i>').addClass('fas fa-lg ' + icon),
                  $('<span>').html('&nbsp;' + iconText),
                ),
                $('<p>').addClass('card-text mb-2 text-center')
                        .text(notification.message),
                $('<button>')
                  .addClass('btn btn-sm btn-primary btn-notif-action')
                  .attr('type', 'button').html(btnText)
                  .attr('data-id', notification._id),
              ),
            ),
          ),
        );
      }
      $('.bell-notification').addClass('swing infinite');
      $('.bell-counter').attr('count', response.notifications.length);
      $('.bell-counter').show();
    } else {
      alertsBody.append(
        $('<h2>').addClass('text-center grey-text mb-3').append(
          $('<i>').addClass('fas fa-check fa-4x'),
          $('<br>'),
          $('<br>'),
          $('<span>').text(t('noNotifications')),
        ),
      );
    }
  });
};

anlixDocumentReady.add(function() {
  if (!window.location.href.includes('/login')) {
    fetchNotifications();
  }
});

$(document).on('click', '.btn-notif-action', function(event) {
  $.ajax({type: 'POST',
          url: '/notification/del',
          traditional: true,
          data: {id: $(event.target).data('id')}})
  .done(() => {
    fetchNotifications();
  });
});

export {displayAlertMsg, secondsTimeSpanToHMS, socket};
