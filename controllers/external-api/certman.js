const http = require('http');

const CERTMANHOST = (process.env.FLM_CERTMAN_ADDR || '');
const CERTMANPORT = (process.env.FLM_CERTMAN_PORT || 9999);

const certmanController = {};

const requestCertman = function(method, path) {
  return new Promise((resolve, reject)=>{
    let options = {
      method: method,
      hostname: CERTMANHOST,
      port: CERTMANPORT,
      path: encodeURI(path),
      timeout: 5000,
    };
    http.request(options, (resp)=>{
      resp.setEnconding('utf8');
      let data = '';
      resp.on('data', (chunk)=>data+=chunk);
      resp.on('error', reject);
      resp.on('timeout', reject);
      resp.on('end', () => resolve({status: resp.statusCode, data: data}));
    });
  });
};

certmanController.getCertmanCACert = async function() {
  try {
    let response = await requestCertman('GET', '/api/v1/cert/ca-tr069');
    if (response.status !== 200 || response.data.length == 0) return '';
    let data = JSON.parse(response.data);
    if (!data.caCertificate) return '';
    return data.caCertificate;
  } catch (err) {
    return '';
  }
};

module.exports = certmanController;
