$(document).ready(function() {
  if (!$('#measure-previous-arrow').hasClass('text-primary')) {
    $('#measure-previous-div').hide();
  }

  $(document).on('click', '.btn-throughput-measure-modal', function(event) {
    let row = $(event.target).parents('tr');
    let id = row.data('deviceid');
    $('#speed-test-hlabel').text(id);
    for (let i = 0; i < 5; i++) {
      $('#measure-previous-data').append(
        $('<tr>').append(
          '<td>50 Mbps</td>'+
          '<td>23/11/2001 15:32</td>'+
          '<td>Fulano</td>'
        ),
      );
    }
    $('#speed-test').modal('show');
  });

  $('#measure-test-arrow').click((event)=>{
    let div = $('#measure-test-arrow');
    if (div.hasClass('text-primary')) {
      div.removeClass('text-primary fa-chevron-up').addClass('fa-chevron-down');
      $('#measure-test-div').hide();
    } else {
      div.removeClass('fa-chevron-down').addClass('text-primary fa-chevron-up');
      $('#measure-test-div').show();
    }
  });

  $('#measure-previous-arrow').click((event)=>{
    let div = $('#measure-previous-arrow');
    if (div.hasClass('text-primary')) {
      div.removeClass('text-primary fa-chevron-up').addClass('fa-chevron-down');
      $('#measure-previous-div').hide();
    } else {
      div.removeClass('fa-chevron-down').addClass('text-primary fa-chevron-up');
      $('#measure-previous-div').show();
    }
  });

  $('.btn-start-speed-test').click(function(event) {
    $('.btn-start-speed-test').prop('disabled', true);
    $('#speed-test-placeholder').hide();
    $('#speed-test-result').hide();
    $('#speed-test-error').hide();
    $('#speed-test-waiting').show();
    setTimeout(()=>{
      $('#speed-test-waiting').hide();
      $('#speed-test-result').show();
      $('.btn-start-speed-test').prop('disabled', false);
    }, 2000);
  });

  // Restore default modal state
  $('#speed-test').on('hidden.bs.modal', function() {
    $('#speed-test-placeholder').show();
    $('#speed-test-result').hide();
    $('#speed-test-error').hide();
    $('#speed-test-waiting').hide();
    $('#measure-previous-data').empty();
  });
});
