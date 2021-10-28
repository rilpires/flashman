import 'jquery-mask-plugin';

let forceUpdateFlashman = function() {
  swal({
    title: 'Atualizando Flashman...',
    onOpen: () => {
      swal.showLoading();
    },
  });

  $.ajax({
    type: 'POST',
    url: '/upgrade/force',
    dataType: 'json',
    data: JSON.stringify({}),
    contentType: 'application/json',
    success: function(resp) {
      swal.close();
      if (resp.updated) {
        swal({
          type: 'success',
          title: 'Atualização feita com sucesso!',
          text: 'Você precisará fazer login novamente',
          confirmButtonColor: '#4db6ac',
        }).then(function() {
          window.location.href = '/logout';
        });
      } else {
        swal({
          type: 'error',
          title: 'Erro ao atualizar',
          confirmButtonColor: '#4db6ac',
        });
      }
    },
  });
};

let alertMajorUpdateFlashman = function() {
  swal({
    type: 'warning',
    title: 'Atualização importante disponível!',
    text: 'A nova versão do Flashman requer uma instalação manual. Por favor, '+
          'entre na nossa página de documentação e siga os passos para '+
          'atualizar o seu Flashman para a nova versão. Se precisar, entre em '+
          'contato com a equipe Anlix.',
    confirmButtonText: 'Ver instruções',
    confirmButtonColor: '#4db6ac',
  }).then(function(result) {
    if (result.value) {
      window.open('https://documentacao.anlix.io/doku.php');
    }
  });
};

let alertUpdateFlashman = function() {
  swal({
    type: 'warning',
    title: 'Atualização disponível!',
    text: 'Deseja instalar a nova versão agora?',
    confirmButtonText: 'Atualizar',
    confirmButtonColor: '#4db6ac',
    cancelButtonText: 'Agora não',
    cancelButtonColor: '#f2ab63',
    showCancelButton: true,
  }).then(function(result) {
    if (result.value) {
      forceUpdateFlashman();
    }
  });
};

let checkUpdateFlashman = function() {
  swal({
    title: 'Buscando atualizações...',
    onOpen: () => {
      swal.showLoading();
    },
  });

  $.ajax({
    type: 'POST',
    url: '/upgrade',
    dataType: 'json',
    data: JSON.stringify({}),
    contentType: 'application/json',
    success: function(resp) {
      swal.close();
      if (resp.hasUpdate) {
        alertUpdateFlashman();
      } else {
        swal({
          type: 'error',
          title: 'Nenhuma atualização encontrada',
          confirmButtonColor: '#4db6ac',
        });
      }
    },
  });
};

$(document).ready(function() {
  $(document).on('click', '.update', checkUpdateFlashman);
  $('.ip-mask-field').mask('099.099.099.099');

  $.ajax({
    type: 'GET',
    url: '/data_collecting/service/parameters',
    success: function(resp) {
      for (let parameter in resp) {
        // element id is derived from the data_collecting original parameter name.
        let element = document.getElementById('data_collecting_service_'+parameter);
        if (!element) continue; // if element doesn't exist, skip it.

        let value = resp[parameter];
        switch (value.constructor) { // value assignment to the html element differs by data type.
          case Boolean: // a checkbox implements boolean values.
            element.checked = value;
            break;
          case String: // an input field of type text implements strings.
            element.value = value;
            if (element.value !== '') element.previousElementSibling.classList.add('active');
            break;
          case Number: // an input field of type numeric implements numbers.
            element.value = value;
            break;
        }
      }
    },
  });
  let isSuperuser = $('.container').data('superuser');
  let hasUpgrade = $('.container').data('upgrade');
  let hasMajorUpgrade = $('.container').data('major-upgrade');
  if (isSuperuser && hasMajorUpgrade) {
    alertMajorUpdateFlashman();
  } else if (isSuperuser && hasUpgrade && Math.random() < 0.3) {
    alertUpdateFlashman();
  }
});
