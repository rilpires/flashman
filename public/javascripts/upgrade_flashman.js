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
    url: '/data_collecting/config',
    success: function(resp) {
      let isActive = document.getElementById('data_collecting_service_is_active');
      if (isActive) isActive.checked = resp.data_collecting_is_active || false;
      let alarmFqdn = document.getElementById('data_collecting_service_alarm_fqdn');
      if (alarmFqdn) alarmFqdn.value = resp.data_collecting_alarm_fqdn || '';
      let pingFqdn = document.getElementById('data_collecting_service_ping_fqdn');
      if (pingFqdn) pingFqdn.value = resp.data_collecting_ping_fqdn || '';
      let pingPackets = document.getElementById('data_collecting_service_ping_packets');
      if (pingPackets) pingPackets.value = resp.data_collecting_ping_packets;
      [alarmFqdn, pingFqdn].forEach((input) => {
        if (input && input.value !== '') input.previousElementSibling.classList.add('active');
      });
    },
  });
});
