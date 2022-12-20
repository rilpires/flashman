const http = require('http');

const PROVIDER = (process.env.FLM_PROVIDER || '');
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
    let req = http.request(options, (resp)=>{
      if (resp.setEnconding) resp.setEnconding('utf8');
      let data = '';
      resp.on('data', (chunk)=>data+=chunk);
      resp.on('end', () => resolve({status: resp.statusCode, data: data}));
    });
    req.on('error', reject);
    req.on('timeout', reject);
    req.end();
  });
};

certmanController.getCertmanCACert = async function() {
  try {
    // No provider configured, can't query for CA certificate
    if (PROVIDER === '') return '';
    let response = await requestCertman(
      'GET', `/api/v1/cert/ca-tr069?provider=${PROVIDER}`,
    );
    if (response.status !== 200 || response.data.length == 0) return '';
    let data = JSON.parse(response.data);
    if (!data.caCertificate) return '';
    return data.caCertificate;
  } catch (err) {
    return '';
  }
};

module.exports = certmanController;
