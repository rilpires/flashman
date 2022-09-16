const TasksAPI = require('../../external-genieacs/tasks-api');
const DevicesAPI = require('../../external-genieacs/devices-api');
const utilHandlers = require('../util.js');
const http = require('http');

let acsMeshDeviceHandler = {};

const checkMeshObjsCreated = function(device) {
  return new Promise((resolve, reject) => {
    let acsID = device.acs_id;
    let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
    let fields = cpe.getModelFields();
    let query = {_id: acsID};
    let projection = `${fields.mesh2.ssid}, ${fields.mesh5.ssid}`;
    let path =
      `/devices/?query=${JSON.stringify(query)}&projection=${projection}`;
    let options = {
      method: 'GET',
      hostname: 'localhost',
      port: 7557,
      path: encodeURI(path),
    };
    let result = {
      mesh2: false,
      mesh5: false,
      success: true,
    };
    let req = http.request(options, (resp)=>{
      resp.setEncoding('utf8');
      let data = '';
      resp.on('data', (chunk)=>data+=chunk);
      resp.on('end', async () => {
        try {
          data = JSON.parse(data)[0];
        } catch (e) {
          result.success = false;
          resolve(result);
        }
        if (utilHandlers.checkForNestedKey(
          data, `${fields.mesh2.ssid}._value`,
        )) {
          result.mesh2 = true;
        }
        if (utilHandlers.checkForNestedKey(
          data, `${fields.mesh5.ssid}._value`,
        )) {
          result.mesh5 = true;
        }
        resolve(result);
      });
    });
    req.end();
  });
};

const fetchMeshBSSID = function(device, meshMode) {
  return new Promise((resolve, reject) => {
    let acsID = device.acs_id;
    let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
    let fields = cpe.getModelFields();
    let query = {_id: acsID};
    let projection = '';
    if (meshMode === 2 || meshMode === 4) {
      projection += `${fields.mesh2.bssid},`;
    }
    if (meshMode === 3 || meshMode === 4) {
      projection += `${fields.mesh5.bssid},`;
    }
    // Removing trailing comma from projection
    projection = projection.slice(0, -1);
    let path =
      `/devices/?query=${JSON.stringify(query)}&projection=${projection}`;
    let options = {
      method: 'GET',
      hostname: 'localhost',
      port: 7557,
      path: encodeURI(path),
    };
    let req = http.request(options, (resp)=>{
      resp.setEncoding('utf8');
      let data = '';
      resp.on('data', (chunk)=>data+=chunk);
      resp.on('end', async () => {
        try {
          data = JSON.parse(data)[0];
        } catch (e) {
          console.log('Error parsing bssid data from genie');
          return resolve({success: false});
        }
        let bssid2 = '';
        let bssid5 = '';
        // Mesh modes that use 2.4GHz radio
        if (meshMode === 2 || meshMode === 4) {
          // Check if field exists and collect it from genie
          let field = `${fields.mesh2.bssid}._value`;
          if (utilHandlers.checkForNestedKey(data, field)) {
            bssid2 = utilHandlers.getFromNestedKey(data, field);
          }
          // We need to make sure bssid2 is not empty and different than 0
          if (!bssid2 || bssid2 === '00:00:00:00:00:00') {
            return {success: false};
          }
        }
        // Mesh modes that use 5Hz radio
        if (meshMode === 3 || meshMode === 4) {
          // Check if field exists and collect it from genie
          let field = `${fields.mesh5.bssid}._value`;
          if (utilHandlers.checkForNestedKey(data, field)) {
            bssid5 = utilHandlers.getFromNestedKey(data, field);
          }
          // We need to make sure bssid5 is not empty and different than 0
          if (!bssid5 || bssid5 === '00:00:00:00:00:00') {
            return {success: false};
          }
        }
        resolve({success: true, mesh2: bssid2, mesh5: bssid5});
      });
    });
    req.end();
  });
};

acsMeshDeviceHandler.createVirtualAPObjects = async function(device) {
  let acsID = device.acs_id;
  // We have to check if the virtual AP object has been created already
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  const meshField = fields.mesh2.ssid.replace('.SSID', '');
  const meshField5 = fields.mesh5.ssid.replace('.SSID', '');
  const getObjTask = {
    name: 'getParameterValues',
    parameterNames: [meshField, meshField5],
  };
  let meshObjsStatus;
  try {
    let ret = await TasksAPI.addTask(acsID, getObjTask);
    if (!ret || !ret.success || !ret.executed) {
      throw new Error('task error');
    }
    if (ret.executed) {
      meshObjsStatus = await checkMeshObjsCreated(device);
      if (!meshObjsStatus.success) {
        throw new Error('invalid data');
      }
    }
  } catch (e) {
    const msg = `[!] -> ${e.message} in ${acsID}`;
    console.log(msg);
    return {success: false, msg: msg};
  }
  let deleteMesh5VAP = false;
  let createMesh2VAP = false;
  let createMesh5VAP = false;
  /*
    If the 2.4GHz virtual AP object hasn't been created we must create it.
    Since the objects are created in order we must delete the 5GHz virtual AP
    object if it exists and then recreate it. We never delete the 2.4GHz VAP
    object, only the 5GHz one in specific cases
  */
  if (!meshObjsStatus.mesh2) {
    createMesh2VAP = true;
    createMesh5VAP = true;
    if (meshObjsStatus.mesh5) {
      deleteMesh5VAP = true;
    }
  } else if (!meshObjsStatus.mesh5) {
    // 2.4GHz virtual AP object is created. Here we treat only the 5GHz case.
    createMesh5VAP = true;
  }
  if (deleteMesh5VAP) {
    let delObjTask = {name: 'deleteObject', objectName: meshField5};
    try {
      let ret = await TasksAPI.addTask(acsID, delObjTask);
      if (!ret || !ret.success || !ret.executed) {
        throw new Error('delObject task error');
      }
    } catch (e) {
      const msg = `[!] -> ${e.message} in ${acsID}`;
      console.log(msg);
      return {success: false, msg: msg};
    }
  }
  // Virtual APs objects haven't been created yet - do so now
  if (createMesh2VAP || createMesh5VAP) {
    let addObjTask = {
      name: 'addObject',
      // Removes index of the WLANConfiguration field name.
      // Will work only if 2.4GHz VAP WLANConfiguration index is lower than 10
      objectName: meshField.slice(0, -2),
    };
    let numObjsToCreate = createMesh2VAP + createMesh5VAP; // cast bool to int
    for (let i = 0; i < numObjsToCreate; i++) {
      try {
        let ret = await TasksAPI.addTask(acsID, addObjTask);
        if (!ret || !ret.success || !ret.executed) {
          throw new Error('task error');
        }
      } catch (e) {
        const msg = `[!] -> ${e.message} in ${acsID}`;
        console.log(msg);
        return {success: false, msg: msg};
      }
      // A getParameterValues call forces the whole object to be created
      try {
        let ret = await TasksAPI.addTask(acsID, getObjTask);
        if (!ret || !ret.success || !ret.executed) {
          throw new Error('task error');
        }
      } catch (e) {
        const msg = `[!] -> ${e.message} in ${acsID}`;
        console.log(msg);
        return {success: false, msg: msg};
      }
    }
  }
  // We must populate the newly created fields, signal that to next function
  return {success: true, populate: (createMesh2VAP || createMesh5VAP)};
};

acsMeshDeviceHandler.getMeshBSSIDFromGenie = async function(device, meshMode) {
  let acsID = device.acs_id;
  // We have to check if the virtual AP object has been created already
  let cpe = DevicesAPI.instantiateCPEByModelFromDevice(device).cpe;
  let fields = cpe.getModelFields();
  const bssidField2 = fields.mesh2.bssid;
  const bssidField5 = fields.mesh5.bssid;
  const getObjTask = {
    name: 'getParameterValues',
    parameterNames: [],
  };
  if (meshMode === 2 || meshMode === 4) {
    getObjTask.parameterNames.push(bssidField2);
  }
  if (meshMode === 3 || meshMode === 4) {
    getObjTask.parameterNames.push(bssidField5);
  }
  let bssidsStatus;
  try {
    let ret = await TasksAPI.addTask(acsID, getObjTask);
    if (!ret || !ret.success || !ret.executed) {
      throw new Error('task error');
    }
    bssidsStatus = await fetchMeshBSSID(device, meshMode);
    if (!bssidsStatus.success) {
      throw new Error('invalid data');
    }
  } catch (e) {
    const msg = `[!] -> ${e.message} in ${acsID}`;
    console.log(msg);
    return {success: false, msg: msg};
  }
  return {
    success: true,
    bssid_mesh2: bssidsStatus.mesh2.toUpperCase(),
    bssid_mesh5: bssidsStatus.mesh5.toUpperCase(),
  };
};

acsMeshDeviceHandler.getMeshBSSIDs = async function(cpe, mac) {
  let meshBSSIDs = {mesh2: '', mesh5: ''};
  let permissions = cpe.modelPermissions();
  if (
    permissions.features.meshWifi &&
    permissions.mesh.bssidOffsets2Ghz &&
    permissions.mesh.bssidOffsets5Ghz
  ) {
    let macOctets2 = mac.split(':');
    let macOctets5 = mac.split(':');
    for (let i = 0; i < macOctets2.length; i++) {
      macOctets2[i] = (
        parseInt(`0x${macOctets2[i]}`) +
        parseInt(permissions.mesh.bssidOffsets2Ghz[i])
      ).toString(16).toUpperCase();
      // We need the second hex digit for BSSID addresses
      if (macOctets2[i].length === 1) {
        macOctets2[i] = `0${macOctets2[i]}`;
      }
      macOctets5[i] = (
        parseInt(`0x${macOctets5[i]}`) +
        parseInt(permissions.mesh.bssidOffsets5Ghz[i])
      ).toString(16).toUpperCase();
      // We need the second hex digit for BSSID addresses
      if (macOctets5[i].length === 1) {
        macOctets5[i] = `0${macOctets5[i]}`;
      }
    }
    meshBSSIDs.mesh2 = macOctets2.join(':');
    meshBSSIDs.mesh5 = macOctets5.join(':');
  }
  return meshBSSIDs;
};

module.exports = acsMeshDeviceHandler;
