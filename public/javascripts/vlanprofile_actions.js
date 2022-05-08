
import {anlixDocumentReady} from '../src/common.index.js';
import {displayAlertMsg} from './common_actions.js';

const t = i18next.t;

window.checkVlanName = function(input) {
  if (/[^A-Za-z\-0-9_]+/.test(input.value)) {
    input.setCustomValidity(t('vlanProfileNameCharRules'));
  } else {
    $.get('/vlan/profile/fetch', function(res) {
      if (res.type == 'success') {
        let distinctValidity = false;

        res.vlanProfiles.forEach(function(vp) {
          if (vp.profile_name === input.value) {
            distinctValidity = true;
          }
        });
        if (distinctValidity) {
          input.setCustomValidity(t('vlanProfileNameUniquenessRule'));
        } else {
          input.setCustomValidity('');
        }
      }
    });
  }
};


anlixDocumentReady.add(function() {
  $('.needs-validation').submit(function(event) {
    if ($(this)[0].checkValidity()) {
      $.post($(this).attr('action'), $(this).serialize(), 'json')
        .done(function(res) {
          displayAlertMsg(res);
          if (res.success) {
            // redirect to show vlan profiles after 1 sec timeout
            setTimeout(function() {
              window.location.href = '/vlan/profile';
            }, 1000);
          }
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
