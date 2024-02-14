import expect from 'expect';
import {
  describe, it, context
} from 'mocha';
import Wellplate from '../../../../../app/packs/src/models/Wellplate';
import { wellplate2x3EmptyJson } from '../../../fixture/wellplates/wellplate_3_2_empty';

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
});
