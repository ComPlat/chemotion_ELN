import expect from 'expect';
import {
  describe, it
} from 'mocha';
import Wellplate from '../../../../../app/packs/src/models/Wellplate';
import { wellplate2x3EmptyJson } from '../../../fixture/wellplates/wellplate_2_3_empty';
import { wellplate8x12EmptyJson } from '../../../fixture/wellplates/wellplate_8_12_empty';

describe('Wellplate', async () => {
  describe('constructor()', async () => {
    context('when input is valid and has no samples in wells', async () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);

      it('created a wellplate of size 3 x 2', async () => {
        expect(wellplate.size).toEqual(6);
        expect(wellplate.height).toEqual(2);
        expect(wellplate.width).toEqual(3);
      });
    });
  });
  
  describe('calculatePositionOfWellByIndex()', async () => {
    const wellplate = new Wellplate(wellplate8x12EmptyJson);
    context('with 12x8 wellplate', async () => {
    context('when requested well is available', async () => {
      it('returns position [1;1]', async () => {
        expect(wellplate.calculatePositionOfWellByIndex(0)).toEqual({x:1,y:1});
      });
      it('returns position [12;8]', async () => {
        expect(wellplate.calculatePositionOfWellByIndex(96)).toEqual({x:13,y:9});
      });
    });
  });
  });
});
