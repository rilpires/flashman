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
                '12', '13', '36', '40', '44', '48', '149', '153', '157',
                '161', '165', 'auto'].includes(channel),
        err: ['Canal selecionado inválido'],
      };
    };

    Validator.prototype.validateBand = function(band) {
      return {
        valid: ['auto', 'HT20', 'HT40', 'VHT20', 'VHT40', 'VHT80'].includes(band),
        err: ['Somente são aceitos os valores auto,HT20,HT40,VHT20,VHT40 e VHT80'],
      };
    };

    Validator.prototype.validateMode = function(mode) {
      return {
        valid: ['11g', '11n', '11na', '11ac'].includes(mode),
        err: ['Somente são aceitos os valores 11g, 11n, 11na e 11ac'],
      };
    };

    Validator.prototype.validatePower = function(power) {
      return {
        valid: ['25', '50', '75', '100', 25, 50, 75, 100].includes(power),
        err: ['Somente são aceitos os valores 25%, 50%, 75% e 100%'],
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
      let ret = validateRegex(pass, minlength, 64, /^[a-zA-Z0-9\.\-\_\#\!\@\$\%\&\*\=\+\?]+$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateSSID = function(ssid) {
      const messages = [
        'Este campo é obrigatório',
        'Este campo não pode ter mais de 32 caracteres',
        'Somente são aceitos: caracteres alfanuméricos, espaços, ponto, - e _',
      ];
      let ret = validateRegex(ssid, 1, 32, /^[a-zA-Z0-9\.\-\_\#\s]+$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateSSIDPrefix = function(ssid, isRequired) {
      const messages = [
        'Este campo é obrigatório',
        'Este campo não pode ter mais de 16 caracteres',
        'São aceitos caracteres alfanuméricos, espaços, ponto, -, _ e #',
        'Deve ter pelo menos um ponto, -, _ ou # como separador no final',
      ];
      let ret = validateRegex(ssid, ((isRequired === true)?1:0), 16,
        /^([a-zA-Z0-9\.\-\_\#\s]+(\.|\-|\_|\#))*$/);
      
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateWifiPassword = function(pass) {
      const messages = [
        'Este campo deve ter no mínimo 8 caracteres',
        'Este campo não pode ter mais de 64 caracteres',
        'Letras com acento, cedilha, e alguns caracteres especiais não são aceitos',
      ];
      let ret = validateRegex(pass, 8, 64, /^[a-zA-Z0-9\.\-\_\#\!\@\$\%\&\*\=\+\?]+$/);
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

    Validator.prototype.validateIPAgainst = function(ip, ipChallenge) {
      return {
        valid: !ip.includes(ipChallenge),
        err: ['Este campo não pode conter o valor ' + ipChallenge +
              '. O valor é reservado.'],
      };
    };

    Validator.prototype.validateNetmask = function(netmask) {
      return {
        valid: [24, 25, 26, '24', '25', '26'].includes(netmask),
        err: ['Somente são aceitas as máscaras 24, 25 ou 26'],
      };
    };

    Validator.prototype.validateIpv6Enabled = function(ipv6Enabled) {
      return {
        valid: ['0', '1', '2', 0, 1, 2].includes(ipv6Enabled),
        err: ['Valor inválido para ativar ou desativar IPv6'],
      };
    };

    Validator.prototype.checkAddressSubnetRange = function(deviceIp,
      ipAddressGiven, maskBits) {
      let i;
      let aux;
      let numberRegex = /[0-9]+/;
      let lanSubmask = [];
      let lanSubnet = [];
      let subnetRange = [];
      let maxRange = [];
      let isOnRange = true;
      let isIpFormatCorrect = true;

      deviceIp = deviceIp.split('.');
      ipAddressGiven = ipAddressGiven.split('.');

      if (ipAddressGiven.length != 4 || deviceIp.length != 4) {
        isIpFormatCorrect = false;
      } else {
        for (i = 0; i < ipAddressGiven.length; i++) {
          if (!numberRegex.test(ipAddressGiven[i]) ||
              !numberRegex.test(deviceIp[i])) {
            isIpFormatCorrect = false;
          }
        }
      }
      if (isIpFormatCorrect) {
        // build the mask address from the number of bits that mask have
        for (i = 0; i < 4; i++) {
          if (maskBits > 7) {
            lanSubmask.push((2**8)-1);
          } else if (maskBits >= 0) {
            // based on (sum of (2^(8-k)) from 0 to j)  - 256
            // to generate the sequence :
            // 0, 128, 192, 224, 240, 248, 252, 254
            lanSubmask.push(256-2**(8-maskBits));
          } else {
            lanSubmask.push(0);
          }
          subnetRange.push(255 - lanSubmask[i]);
          maskBits -= 8;
        }
        for (i = 0; i < lanSubmask.length; i++) {
          // apply the mask to get the start of the subnet
          aux = lanSubmask[i] & deviceIp[i];
          lanSubnet.push(aux);
          // get the range of ip's that is allowed in that subnet
          maxRange.push(aux + subnetRange[i]);
        }
        // check if the given ip address for port mapping is in the range
        for (i = 0; i < ipAddressGiven.length; i ++) {
          if (!(ipAddressGiven[i] >= lanSubnet[i] &&
                ipAddressGiven[i] <= maxRange[i])) {
            // whenever block is out of range, put to false
            isOnRange = false;
          }
        }
        // check if is broadcast or subnet id
        if (ipAddressGiven.every(function(e, idx) {
          return (e == lanSubnet[idx] || e == maxRange[idx]);
        })) {
          isOnRange = false;
        }
      }
      return isOnRange && isIpFormatCorrect;
    };

    return Validator;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = deviceValidator;
  } else {
    window.Validator = deviceValidator;
  }
})();
