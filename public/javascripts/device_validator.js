/* global __line */
/**
 * @namespace public/javascripts/device_validator
 */

(function() {
  // this code is used in both back end and front end and we need to use
  // i18next in both. So this will handle i18next for both cases.
  const nodeVer = typeof process !== 'undefined' && process.versions
    && process.versions.node;
  // making webpack ignore 'require' global call.
  const nodeRequire = nodeVer ?
    typeof __webpack_require__ === 'function'? __non_webpack_require__ : require
    : undefined;
  // using translation function from global i18next (front end) or from our
  // language controller (nodejs back end).
  const t = typeof i18next !== 'undefined' ? i18next.t
    : nodeRequire('../../controllers/language.js').i18next.t;

  let deviceValidator = (function() {
    let validateRegex = function(value, minlength, length, regex) {
      let valid = true;
      let err = [];
      if (typeof value === 'string') {
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
      } else {
        valid = false;
        err.push(3);
      }
      return {valid: valid, err: err};
    };

    let Validator = function() {};

    Validator.prototype.validateExtReference = function(extReference) {
      let expectedRegex = new RegExp(/^.{0,256}$/);
      let expectedMask;
      let regexIsValid = false;
      let kindIsValid = true;

      // Size is not valid
      if (!(expectedRegex.test(extReference.data))) {
        return {
          valid: false,
          err: [t(
            'thisFieldCannotHaveMoreThanMaxChars',
            {max: 256},
          )],
        };
      }

      // Dinamically checking king and getting the expected regex by language
      switch (extReference.kind.toLowerCase()) {
        case t('personIdentificationSystem').toLowerCase():
          expectedRegex = new RegExp(t('personIdentificationRegex'));
          expectedMask = t('personIdentificationMask');
        break;
        case t('enterpriseIdentificationSystem').toLowerCase():
          expectedRegex = new RegExp(t('enterpriseIdentificationRegex'));
          expectedMask = t('enterpriseIdentificationMask');
        break;
        case t('Other').toLowerCase():
          // In case of valid kind ("Other") and valid size (tested rigth above)
          // then we can return the validator as valid
          return {valid: true};
        default:
          kindIsValid = false;
      }

      // After we get the expected regex for each identification system by
      // language, we can validate the regex
      if (extReference.data.length > 0) {
        regexIsValid = expectedRegex.test(extReference.data);
      } else {
        // Nothing to validate if data is empty
        regexIsValid = true;
      }

      let errors = [];
      if (!kindIsValid) {
        errors.push(t('invalidContractNumberKind', {kind: extReference.kind}));
      }
      if (!regexIsValid && expectedMask) {
        errors.push(t('invalidContractNumberData',
          {kind: extReference.kind, mask: expectedMask}));
      }
      return {
        valid: (kindIsValid && regexIsValid),
        err: errors,
      };
    };

    Validator.prototype.validateMac = function(mac) {
      return {
        valid: mac.match(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/),
        err: [t('invalidMacAddress')],
      };
    };

    Validator.prototype.validateChannel = function(channel, list5ghz) {
      let validChannels = [
        'auto',
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
      ];
      if (list5ghz) {
        validChannels = validChannels.concat(list5ghz.map((ch)=>ch.toString()));
      }
      return {
        valid: validChannels.includes(channel),
        err: [t('invalidSelectedChannel')],
      };
    };

    Validator.prototype.validateBand = function(band) {
      return {
        valid: ['auto', 'HT20', 'HT40',
                'VHT20', 'VHT40', 'VHT80'].includes(band),
        err: [t('willOnlyAcceptValueWifiBandwidth')],
      };
    };

    Validator.prototype.validateMode = function(mode) {
      return {
        valid: ['11g', '11n', '11na', '11ac', '11ax'].includes(mode),
        err: [t('willOnlyAcceptValueWifiMode')],
      };
    };

    Validator.prototype.validatePower = function(power) {
      return {
        valid: ['25', '50', '75', '100', 25, 50, 75, 100].includes(power),
        err: [t('willOnlyAcceptValueWifiPower')],
      };
    };

    Validator.prototype.validateUser = function(user) {
      const messages = [
        t('thisFieldIsMandatory'),
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 64}),
        t('acceptableCharOnly0-9a-zA-Z @ul-.'),
        t('mustBeAString'),
      ];
      let ret = validateRegex(user, 1, 64, /^[a-zA-Z0-9@.\-_#\s]+$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validatePassword = function(pass, minlength) {
      if (typeof(minlength) === 'undefined') {
        minlength = 8;
      }
      const messages = [
        t('thisFieldMustHaveAtLeastMinChars', {min: minlength}),
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 64}),
        t('someEspecialCharactersAccentCedileAreNotAccepted'),
        t('mustBeAString'),
      ];
      let ret = validateRegex(pass, minlength, 64,
                              /^[a-zA-Z0-9.\-_#!@$%&*=+?]+$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateSSID = function(
      ssid, accentedChars, spaceChar,
    ) {
      const messages = [
        t('thisFieldIsMandatory'),
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 32}),
        ((spaceChar) ?
          t('acceptableCharsAre0-9a-zA-Z .-ul') : // message with allowed space
          t('acceptableCharsAre0-9a-zA-Z.-ul')), // message with denied space
        t('mustBeAString'),
      ];
      if (accentedChars) {
        // Remove diacritics before applying the regex test
        ssid = ssid.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      }
      let ret = (spaceChar) ?
        validateRegex(ssid, 1, 32, /^[a-zA-Z0-9.\-_#\s]+$/) :
        validateRegex(ssid, 1, 32, /^[a-zA-Z0-9.\-_#]+$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateSSIDPrefix = function(ssid) {
      const isRequired = (ssid !== '');
      const messages = [
        t('thisFieldIsMandatory'),
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 16}),
        t('acceptableCharsAre0-9a-zA-Z .-ul#'),
        t('endingSeparatorMustHaveAtLeastOne.-ul#'),
        t('mustBeAString'),
      ];
      let ret = validateRegex(ssid, ((isRequired === true)?1:0), 16,
        /^([a-zA-Z0-9.\-_#\s]+(\.|-|_|#))*$/);

      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateWebInterfacePassword =
     function(pass) {
      const messages = [
        t('thisFieldMustHaveAtLeastMinChars', {min: 8}),
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 16}),
        t('onuWebPasswordTooltip'),
        t('mustBeAString'),
      ];
      let noSpecialAtStartRegex = new RegExp(/^[^-!@#$%^&*+_.]/);
      let hasAllCharTypes = new RegExp(''
        + /(?=.*[A-Z])/.source
        + /(?=.*[a-z])/.source
        + /(?=.*[0-9])/.source
        + /(?=.*[-!@#$%^&*+_.]).*/.source);
      let retA = validateRegex(pass, 8, 16, noSpecialAtStartRegex);
      let retB = validateRegex(pass, 8, 16, hasAllCharTypes);
      let valid = retA.valid && retB.valid;
      let err = new Set();
      retA.err.forEach((e)=>err.add(e));
      retB.err.forEach((e)=>err.add(e));
      return {valid: valid, err: Array.from(err).map((ind)=>messages[ind])};
    };


    /**
     * Validates the string passed if is at least 1 character long and at most
     * 16 characters long. The string must only contain numbers and characters.
     *
     * @memberof public/javascripts/device_validator
     *
     * @param {string} field - A string to be validated.
     *
     * @return {{valid: boolean, err: string[]}}
     */
    Validator.prototype.validateTR069ConnectionField = function(field) {
      const messages = [
        t('thisFieldMustHaveAtLeastMinChars', {min: 1}),
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 16}),
        t('tr069ConnectionFieldTooltip'),
        t('mustBeAString'),
      ];

      const onlyCharsAndNumbers = new RegExp(/^[a-zA-Z0-9]+$/);
      let validRegex = validateRegex(field, 1, 16, onlyCharsAndNumbers);

      let errorSet = new Set();
      validRegex.err.forEach(
        (error) => errorSet.add(error),
      );

      return {
        valid: validRegex.valid,
        err: Array.from(errorSet).map((ind) => messages[ind]),
      };
    };


    Validator.prototype.validateWifiPassword = function(pass, accentedChars) {
      const messages = [
        t('thisFieldMustHaveAtLeastMinChars', {min: 8}),
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 64}),
        t('someEspecialCharactersAccentCedileAreNotAccepted'),
        t('mustBeAString'),
      ];
      if (accentedChars) {
        // Remove diacritics before applying the regex test
        pass = pass.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      }
      let ret = validateRegex(pass, 8, 64,
                              /^[a-zA-Z0-9.\-_#!@$%&*=+?]+$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };


    /**
     * Validates the `name` passed to check if it is:
     *  - Bigger than 3 characters;
     *  - Smaller than 128 characters;
     *  - Only contain those characters: `a-z, A-Z, 0-9, space, -, _, period,
     * comma, colon and semi-colon`.
     *
     * @memberof public/javascripts/device_validator
     *
     * @param {String} name - The name to be validated.
     *
     * @return {Object} An `Object` containing:
     *  - `valid` - A `Boolean` if the name is valid or not;
     *  - `err` - An `Array` with all errors in `name`.
     */
    Validator.prototype.validateDeviceName = function(name) {
      const messages = [
        t('thisFieldMustHaveAtLeastMinChars', {min: 3}),
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 128}),
        t('acceptableCharsAre0-9a-zA-Z .-_,:;'),
        t('mustBeAString'),
      ];

      let ret = validateRegex(name, 3, 128, /^[a-zA-Z0-9 \-_.,:;]+$/);

      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };


    Validator.prototype.validateIP = function(ip) {
      const messages = [
        t('thisFieldMustHaveAtLeastMinChars', {min: 7}),
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 15}),
        t('thisFieldMustHaveValidIpFormat'),
        t('mustBeAString'),
      ];
      let ret = validateRegex(ip, 7, 15, /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateFqdn = function(fqdn) {
      const messages = [
        t('thisFieldMustHaveAtLeastMinChars', {min: 1}),
        t('thisFieldCannotHaveMoreThanMaxChars', {max: 255}),
        t('insertValidFqdn'),
        t('mustBeAString'),
      ];
      let ret = validateRegex(fqdn, 1, 255,
        /^[0-9a-z]+(?:-[0-9a-z]+)*(?:\.[0-9a-z]+(?:-[0-9a-z]+)*)+$/i);
      ret.err = ret.err.map((ind) => messages[ind]);
      return ret;
    };

    Validator.prototype.validateIPAgainst = function(ip, ipChallenge) {
      return {
        valid: !ip.includes(ipChallenge),
        err: [
          t('thisFieldCannotHaveTheValueValItIsReserved', {val: ipChallenge})],
      };
    };

    Validator.prototype.validateNetmask = function(netmask) {
      return {
        valid: [24, 25, 26, '24', '25', '26'].includes(netmask),
        err: [t('willOnlyAcceptValueMask')],
      };
    };

    Validator.prototype.validateIpv6Enabled = function(ipv6Enabled) {
      return {
        valid: ['0', '1', '2', 0, 1, 2].includes(ipv6Enabled),
        err: [t('invalidValueToDeactiveIpv6')],
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

    /* RFC 791: in IPv4 the minimum datagram size is 576.
      RFC 8200: in IPv6 the minimum datagram size is 1280.
      RFC 894: In Ethernet the maximum datagram size is 1500.
      RFC 2516: In PPPoE the maximum datagram size is 1492. */
    Validator.prototype.validateMtu = function(mtuField, isPPPoE) {
      if (mtuField) {
        try {
          let mtuValue = Number(mtuField);
          if (Number.isInteger(mtuValue)) {
            let max = (isPPPoE) ? 1492 : 1500;
            if (mtuValue >= 576 && mtuValue <= max) return {valid: true};
            else {
              return {
                valid: false,
                err: [t('invalidFieldsMustBeInRange', {min: 1, max: max})],
              };
            }
          } else return {valid: false, err: [t('valueInvalid')]};
        } catch (e) {
          return {valid: false, err: [t('errorOccurred')]};
        }
      } else return {valid: false, err: [t('emptyField')]};
    };

    /* RFC 2674: VLAN values is between 1 and 4094 */
    Validator.prototype.validateVlan = function(vlanField) {
      if (vlanField) {
        try {
          let vlanValue = Number(vlanField);
          if (Number.isInteger(vlanValue)) {
            if (vlanValue >= 1 && vlanValue <= 4094) return {valid: true};
            else {
              return {
                valid: false,
                err: [t('invalidFieldsMustBeInRange', {min: 1, max: 4094})],
              };
            }
          } else return {valid: false, err: [t('valueInvalid')]};
        } catch (e) {
          return {valid: false, err: [t('errorOccurred')]};
        }
      } else return {valid: false, err: [t('emptyField')]};
    };

    Validator.prototype.checkObjProperties = function(obj, keys) {
      if (!!obj && typeof obj === 'object') {
        return keys.every((k) => {
          return k in obj;
        });
      }
    };

    /* Function to verify if the array of object is
      in the port_mapping format of device model */
    Validator.prototype.checkPortMappingObj = function(rules) {
      let isJsonInFormat = false;
      if (Array.isArray(rules)) {
        let keys = ['ip', 'external_port_start', 'external_port_end',
          'internal_port_start', 'internal_port_end'];
        isJsonInFormat = rules.every((r) => {
          return Validator.prototype.checkObjProperties(r, keys);
        });
      }
      return isJsonInFormat;
    };

    /* Function to verify if the set of port mapping values is allowed
      in terms of: ip address, emptyness, numberness, rangeness,
      oddness, range equality */
    Validator.prototype
    .checkPortMappingValidity = function(rules, subnet, mask) {
      let i;
      let j;
      let portToCheck;
      let portsValues;
      let firstSlice;
      let secondSlice;
      for (i = 0; i < rules.length; i++) {
        portsValues = [];
        portsValues.push(rules[i].external_port_start);
        portsValues.push(rules[i].external_port_end);
        portsValues.push(rules[i].internal_port_start);
        portsValues.push(rules[i].internal_port_end);
        // verify if the given ip is on subnet range
        if (!Validator.prototype.checkAddressSubnetRange(
              subnet, rules[i].ip, mask,
          )) {
          return {
            success: false,
            message: t('outOfSubnetRangeError', {ip: rules[i].ip}),
          };
        }
        // verify if is number, empty, on 2^16 range,
        for (j = 0; j < 4; j++) {
          portToCheck = portsValues[j];
          if (portToCheck == '') {
            return {
              success: false,
              message: t('fieldShouldBeFilledError', {ip: rules[i].ip}),
            };
          } else if (isNaN(parseInt(portToCheck))) {
            return {
              success: false,
              message: t('portsSouldBeNumberError', {ip: rules[i].ip}),
            };
          } else if (!(parseInt(portToCheck) >= 1 &&
                       parseInt(portToCheck) <= 65535 &&
                       parseInt(portToCheck) != 22 &&
                       parseInt(portToCheck) != 23 &&
                       parseInt(portToCheck) != 80 &&
                       parseInt(portToCheck) != 443 &&
                       parseInt(portToCheck) != 7547 &&
                       parseInt(portToCheck) != 58000)) {
            return {
              success: false,
              message: t('portsSouldBeBetweenError', {ip: rules[i].ip}),
            };
          }
        }
        // verify if range is on same size and start/end order
        firstSlice = parseInt(portsValues[1]) - parseInt(portsValues[0]);
        secondSlice = parseInt(portsValues[3]) - parseInt(portsValues[2]);
        if (firstSlice != secondSlice) {
          return {
            success: false,
            message: t('portRangesAreDifferentError', {ip: rules[i].ip}),
          };
        }
        if (firstSlice < 0 || secondSlice < 0) {
          return {
            success: false,
            message: t('portRangesInvertedLimitsError', {ip: rules[i].ip}),
          };
        }
      }
      return {
        success: true,
        message: t('operationSuccessful'),
      };
    };

    /* Function to verify if there is ports overlapping each other */
    Validator.prototype.checkOverlappingPorts = function(rules) {
      let successRet = {success: true, message: t('operationSuccessful')};
      let errorRet = {success: false, message: ''};
      let i;
      let j;
      let ipI;
      let ipJ;
      let exStart;
      let exEnd;
      let inStart;
      let inEnd;
      if (rules.length > 1) {
        for (i = 0; i < rules.length; i++) {
          ipI = rules[i].ip;
          exStart = rules[i].external_port_start;
          exEnd = rules[i].external_port_end;
          inStart = rules[i].internal_port_start;
          inEnd = rules[i].internal_port_end;
          errorRet.message = t('overlappingMappingError',
            {ip: rules[i].ip});
          for (j = i+1; j < rules.length; j++) {
            ipJ = rules[j].ip;
            let port = rules[j].external_port_start;
            if (port >= exStart && port <= exEnd) {
              return errorRet;
            }
            port = rules[j].external_port_end;
            if (port >= exStart && port <= exEnd) {
              return errorRet;
            }
            port = rules[j].internal_port_start;
            if (ipI == ipJ && port >= inStart && port <= inEnd) {
              return errorRet;
            }
            port = rules[j].internal_port_end;
            if (ipI == ipJ && port >= inStart && port <= inEnd) {
              return errorRet;
            }
          }
        }
      }
      return successRet;
    };

    /* Function to check if exists rules that are not compatible to the device:
      Returns a success-message object: false case exist a rule that is not
      possible to do in the device; true if is all clean; */
    Validator.prototype.checkIncompatibility = function(rules, compatibility) {
      let successRet = {success: true, message: t('operationSuccessful')};
      let errorRet = {success: false, message: ''};
      let i;
      let exStart;
      let exEnd;
      let inStart;
      let inEnd;
      if (!Validator.prototype.checkObjProperties(compatibility,
        ['simpleSymmetric', 'simpleAsymmetric',
          'rangeSymmetric', 'rangeAsymmetric'])) {
        errorRet.message = t('jsonInvalidFormat', {errorline: __line});
        return errorRet;
      }
      for (i = 0; i < rules.length; i++) {
        exStart = rules[i].external_port_start;
        exEnd = rules[i].external_port_end;
        inStart = rules[i].internal_port_start;
        inEnd = rules[i].internal_port_end;
        errorRet.message = t('incompatibleRulesError',
          {ip: rules[i].ip});
        if (!compatibility.simpleSymmetric) {
          if (exStart == exEnd && inStart == inEnd) {
            return errorRet;
          }
        }
        if (!compatibility.simpleAsymmetric) {
          if (exStart != inStart && exEnd != inEnd) {
            return errorRet;
          }
        }
        if (!compatibility.rangeSymmetric) {
          if (exStart != exEnd && inStart != inEnd) {
            return errorRet;
          }
        }
        if (!compatibility.rangeAsymmetric) {
          if (exStart != inStart && exEnd != inEnd &&
             exStart != exEnd && inStart != inEnd) {
            return errorRet;
          }
        }
      }
      return successRet;
    };

    return Validator;
  })();

  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    /**
   * @exports public/javascripts/device_validator
   */
    module.exports = deviceValidator;
  } else {
    window.Validator = deviceValidator;
  }
})();
