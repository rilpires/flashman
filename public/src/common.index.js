import 'bootstrap/js/src/modal';
import 'bootstrap/js/src/collapse'; // Collapse animation
import 'bootstrap/js/src/dropdown'; // Dropdown animation
import 'bootstrap/js/src/tab'; // Tab animation
import 'mdbootstrap/js/mdb'; // MDB animations

// Import styles
import '../scss/flashman-bundle.scss';

// Preloader
$(window).on('load', function() { // makes sure the whole site is loaded
  $('#status').fadeOut(); // will first fade out the loading animation
  $('#preloader').delay(350).fadeOut('slow');
  $('body').delay(350).css({'overflow': 'visible'});
});

$(document).ready(function() {
  if ($('#frame-modal-alert-message').text() !== '') {
    $('#frame-modal-alert').modal('show');
  }
});
