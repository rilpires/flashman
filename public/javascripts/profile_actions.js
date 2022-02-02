import {displayAlertMsg} from './common_actions.js';

window.check = function(input) {
  if (input.value != document.getElementById('password').value) {
    input.setCustomValidity('As senhas estão diferentes');
  } else {
    input.setCustomValidity('');
  }
};

anlixDocumentReady.add(function() {
  $('.needs-validation').submit(function(event) {
    if ($(this)[0].checkValidity()) {
      $.post($(this).attr('action'), $(this).serialize(), 'json')
        .done(function(res) {
          displayAlertMsg(res);
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          displayAlertMsg(JSON.parse(jqXHR.responseText));
        });
    } else {
      event.preventDefault();
      event.stopPropagation();
    }
    $(this).addClass('was-validated');
    return false;
  });
});
