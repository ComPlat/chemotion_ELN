import expect from 'expect';
import VesselFactory from '../../../factories/VesselFactory';
import VesselGroup from '../../../../../app/packs/src/models/VesselGroup';

describe('VesselGroup', () => {
  describe('buildFromElements()', () => {
    context('when no vessels given', () => {
      it('empty array returned', () => {
        const vesselGroups = VesselGroup.buildFromElements();
        expect(vesselGroups.length).toBe(0);
      });
    });

    context('when all vessels the same type', () => {
      const vessel1 = VesselFactory.build('with_name');
      const vessel2 = VesselFactory.build('with_name');
      const vessel3 = VesselFactory.build('with_name');

      it('array with one type returned containing 3 vessels', () => {
        const vesselGroups = VesselGroup.buildFromElements([vessel1, vessel2, vessel3]);
        expect(vesselGroups.length).toBe(1);
        expect(vesselGroups[0].vesselItems.length).toBe(3);
      });
    });

    context('when  vessels are of 2 types', async () => {
      const vessel1 = await VesselFactory.build('with_name');
      const vessel2 = await VesselFactory.build('with_name');
      const vessel3 = await VesselFactory.build('with_name');
      const vessel4 = await VesselFactory.build('with_other_name');
      const vessel5 = await VesselFactory.build('with_other_name');

      it('array with 2 types returned containing 3 and 2 vessels each', () => {
        const vesselGroups = VesselGroup.buildFromElements(
          [vessel1, vessel2, vessel3, vessel4, vessel5]
        );
        expect(vesselGroups.length).toBe(2);
        expect(vesselGroups[0].vesselItems.length).toBe(3);
        expect(vesselGroups[1].vesselItems.length).toBe(2);
      });
    });
  });
});