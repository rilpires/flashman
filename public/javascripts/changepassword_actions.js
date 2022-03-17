import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg} from './common_actions.js';

const t = i18next.t;

window.check = function(input) {
  if (input.value != document.getElementById('password').value) {
    input.setCustomValidity(t('passwordsAreDifferent'));
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
          setTimeout(function() {
            $(location).attr('href', '/devicelist');
          }, 1500);
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
