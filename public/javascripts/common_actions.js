const displayAlertMsg = function(res) {
  $('#frame-modal-alert .modal-dialog').removeClass(
    'modal-success modal-danger'
  );
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

export {displayAlertMsg};