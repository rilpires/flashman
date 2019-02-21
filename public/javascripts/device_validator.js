(function() {
  let deviceValidator = (function() {
    let validateRegex = function(value, minlength, length, regex) {
      let valid = true;
      let err = [];

      if (value.length < minlength) {
        valid = false;
        err.push(0);
      } else {
        if (value.length > length) {
          valid = false;
          err.push(1);
        }
        if (!value.match(regex)) {
          valid = false;
          err.push(2);
        }
      }
      return {valid: valid, err: err};
    };

    let Validator = function() {};

    Validator.prototype.validateMac = function(mac) {
      return {
        valid: mac.match(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/),
        err: ['Endereço MAC inválido'],
      };
    };

    Validator.prototype.validateChannel = function(channel) {
      return {
        valid: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
                '36', '40', '44', '48', '52', '56', '60', '64',
                '149', '153', '157', '161', '165', 'auto'].includes(channel),
        err: ['Somente são aceitos os valores 1 a 11 e auto'],
      };
    };

    Validator.prototype.validateBand = function(band) {
      return {
        valid: ['HT20', 'HT40', 'VHT20', 'VHT40', 'VHT80'].includes(band),
        err: ['Somente são aceitos os valores HT20,HT40,VHT20,VHT40 e VHT80'],
      };
    };

    Validator.prototype.validateMode = function(mode) {
      return {
        valid: ['11g', '11n', '11na', '11ac'].includes(mode),
        err: ['Somente são aceitos os valores 11g, 11n, 11na e 11ac'],
      };
    };

    Validator.prototype.validateUser = function(user) {
      const messages = [
        'Este campo é obrigatório',
        'Este campo não pode ter mais de 64 caracteres',
        'Somente são aceitos: caracteres alfanuméricos, espaços, @, _, - e .',
      ];
      let ret = validateRegex(user, 1, 64, /^[a-zA-Z0-9@\.\-\_\#\s]+$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validatePassword = function(pass, minlength) {
      if (typeof(minlength) === 'undefined') {
        minlength = 8;
      }
      const messages = [
        'Este campo deve ter no mínimo ' + minlength + ' caracteres',
        'Este campo não pode ter mais de 64 caracteres',
        'Letras com acento, cedilha, e alguns caracteres especiais não são aceitos',
      ];
      let ret = validateRegex(pass, minlength, 64, /^[a-zA-Z0-9\-\_\#\!\@\$\%\&\*\=\+\?]+$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateSSID = function(ssid) {
      const messages = [
        'Este campo é obrigatório',
        'Este campo não pode ter mais de 32 caracteres',
        'Somente são aceitos: caracteres alfanuméricos, espaços, - e _',
      ];
      let ret = validateRegex(ssid, 1, 32, /^[a-zA-Z0-9\-\_\#\s]+$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateWifiPassword = function(pass) {
      const messages = [
        'Este campo deve ter no mínimo 8 caracteres',
        'Este campo não pode ter mais de 64 caracteres',
        'Letras com acento, cedilha, e alguns caracteres especiais não são aceitos',
      ];
      let ret = validateRegex(pass, 8, 64, /^[a-zA-Z0-9\-\_\#\!\@\$\%\&\*\=\+\?]+$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateIP = function(ip) {
      const messages = [
        'Este campo deve ter no mínimo 7 caracteres',
        'Este campo não pode ter mais de 15 caracteres',
        'Este campo deve conter um formato IP válido',
      ];
      let ret = validateRegex(ip, 7, 15, /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    return Validator;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = deviceValidator;
  } else {
    window.Validator = deviceValidator;
  }
})();
