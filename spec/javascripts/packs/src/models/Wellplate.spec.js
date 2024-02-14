import expect from 'expect';
import {
  describe, it
} from 'mocha';
import Wellplate from '../../../../../app/packs/src/models/Wellplate';
import { wellplate2x3EmptyJson } from '../../../fixture/wellplates/wellplate_2_3_empty';
import { wellplate8x12EmptyJson } from '../../../fixture/wellplates/wellplate_8_12_empty';

describe('Wellplate', async () => {
  describe('constructor()', async () => {
    context('when input is valid and has dimesion 3x2 and has no samples in wells', async () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);

      it('created a wellplate of size 3 x 2', async () => {
        expect(wellplate.size).toEqual(6);
        expect(wellplate.height).toEqual(2);
        expect(wellplate.width).toEqual(3);
      });

      it('created wellplate has 6 wells with correct positions', async () => {
        expect(wellplate.wells.length).toEqual(6);
        expect(wellplate.wells[5].position).toEqual({ x: 3, y: 2 });
      });
    });
    context('when input is valid and has dimesion 12x8 and has no samples in wells', async () => {
      const wellplate = new Wellplate(wellplate8x12EmptyJson);

      it('created a wellplate of size 12 x 8', async () => {
        expect(wellplate.size).toEqual(96);
        expect(wellplate.height).toEqual(8);
        expect(wellplate.width).toEqual(12);
      });

      it('created wellplate has 96 wells with correct positions', async () => {
        expect(wellplate.wells.length).toEqual(96);
      });
    });
  });

  describe('buildEmpty()', async () => {
    context('when only collection id was given', async () => {
      const collectionId = 1;
      const wellplate = Wellplate.buildEmpty(collectionId);

      it('created a wellplate of size 12 x 8', async () => {
        expect(wellplate.size).toEqual(96);
        expect(wellplate.height).toEqual(8);
        expect(wellplate.width).toEqual(12);
      });

    });
    context('when collection id was given and size set to 5x6', async () => {
      const collectionId = 1;
      const width=5;
      const height=6;
      const wellplate = Wellplate.buildEmpty(collectionId,width,height);

      it('created a wellplate of size 12 x 8', async () => {
        expect(wellplate.size).toEqual(30);
        expect(wellplate.height).toEqual(height);
        expect(wellplate.width).toEqual(width);
      });

    });    
  });

  describe('calculatePositionOfWellByIndex()', async () => {
    const wellplate = new Wellplate(wellplate8x12EmptyJson);
    context('with 12x8 wellplate', async () => {
      context('when requested well is available', async () => {
        it('returns position [1;1]', async () => {
          expect(wellplate.calculatePositionOfWellByIndex(0)).toEqual({ x: 1, y: 1 });
        });
        it('returns position [12;8]', async () => {
          expect(wellplate.calculatePositionOfWellByIndex(95)).toEqual({ x: 12, y: 8 });
        });
      });
    });
  });
});
