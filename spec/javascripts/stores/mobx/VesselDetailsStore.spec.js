import expect from 'expect';
import { VesselDetailsStore } from 'src/stores/mobx/VesselDetailsStore';
import VesselFactory from 'factories/VesselFactory';

describe('VesselDetailsStore', async () => {
  describe('.convertCellLineToModel', async () => {
    describe('when object not available', async () => {
      it('creates a valid entry in the store', async () => {
        const store = VesselDetailsStore.create({});
        const vessel = await VesselFactory.build('RBF');
        store.convertVesselToModel(vessel);
        const storeVessel = store.vessels(vessel.id);
        
        expect(storeVessel.vesselName).toBe('RBF');
        expect(storeVessel.vesselDescription).toBe('Description');
        expect(storeVessel.vesselTemplateName).toBe('Vessel 2');
        expect(storeVessel.vesselType).toBe('round bottom flask');
        expect(storeVessel.volumeAmount).toBe(250);
        expect(storeVessel.volumeUnit).toBe('ml');
        expect(storeVessel.materialType).toBe('glass');
        expect(storeVessel.materialDetails).toBe('frosted');
      });
    });
  });
})