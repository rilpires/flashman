const nokiaModel = require(
  '../../controllers/external-genieacs/cpe-models/nokia-g1426ma.js',
);

describe('Nokia G-1426-MA', () => {
  test('Convert broken serial into proper one', ()=>{
    let serial = '4E42454CB15981A9';
    let mac = 'AA:AA:AA:AA:AA:AA';
    serial = nokiaModel.convertGenieSerial(serial, mac);
    expect(serial).toBe('NBELB15981A9');
  });

  test('Keep correct serial from ACS', ()=>{
    let serial = 'NBELEB017CDD';
    let mac = 'AA:AA:AA:AA:AA:AA';
    serial = nokiaModel.convertGenieSerial(serial, mac);
    expect(serial).toBe('NBELEB017CDD');
  });
});
