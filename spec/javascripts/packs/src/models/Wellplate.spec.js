/* eslint-disable no-undef,no-shadow */
import expect from 'expect';
import {
  describe, it
} from 'mocha';
import Wellplate from '../../../../../app/packs/src/models/Wellplate';
import { wellplate2x3EmptyJson } from '../../../fixture/wellplates/wellplate_2_3_empty';
import { wellplate8x12EmptyJson } from '../../../fixture/wellplates/wellplate_8_12_empty';

describe('Wellplate', async () => {
  const sampleMock = {};
  sampleMock.buildChild = () => ({ wasCopied: 'yes' });

  describe('constructor()', async () => {
    context('when input is valid and has dimesion 2x3 and has no samples in wells', async () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);

      it('created a wellplate of size 2 x 3', async () => {
        expect(wellplate.size).toEqual(6);
        expect(wellplate.height).toEqual(3);
        expect(wellplate.width).toEqual(2);
      });

      it('created wellplate has 6 wells with correct positions', async () => {
        expect(wellplate.wells.length).toEqual(6);
        expect(wellplate.wells[5].position).toEqual({ x: 2, y: 3 });
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
      const width = 5;
      const height = 6;
      const wellplate = Wellplate.buildEmpty(collectionId, width, height);

      it('created a wellplate of size 12 x 8', async () => {
        expect(wellplate.size).toEqual(30);
        expect(wellplate.height).toEqual(height);
        expect(wellplate.width).toEqual(width);
      });
    });
  });

  describe('buildFromSamplesAndCollectionId()', async () => {
    context('when only collection id and empty samples list was given', async () => {
      const collectionId = 1;
      const samples = [];
      const wellplate = Wellplate.buildFromSamplesAndCollectionId(samples, collectionId);

      it('created a wellplate of size 12 x 8', async () => {
        expect(wellplate.size).toEqual(96);
        expect(wellplate.height).toEqual(8);
        expect(wellplate.width).toEqual(12);
      });

      it('96 empty wells should be created', async () => {
        expect(wellplate.wells.length).toEqual(96);
      });
    });

    context('when collection id and dimension [7x3] was given and empty samples list was given', async () => {
      const collectionId = 1;
      const samples = [];
      const width = 7;
      const height = 3;
      const wellplate = Wellplate.buildFromSamplesAndCollectionId(samples, collectionId, width, height);

      it('created a wellplate of size 7 x 3', async () => {
        expect(wellplate.size).toEqual(width * height);
        expect(wellplate.height).toEqual(height);
        expect(wellplate.width).toEqual(width);
      });
    });

    context('when collection id and samples list with one samples was given', async () => {
      const width = 1;
      const height = 2;
      const collectionId = 1;
      const samples = [sampleMock];
      const wellplate = Wellplate.buildFromSamplesAndCollectionId(samples, collectionId, width, height);

      it('Two wells should be created', async () => {
        expect(wellplate.wells.length).toEqual(2);
      });

      it('sample was put in well [1;1]', async () => {
        expect(wellplate.wells[0].sample.wasCopied).toEqual('yes');
        console.log(wellplate.wells[0].position);
        expect(wellplate.wells[0].position).toEqual({ x: 1, y: 1 });
      });

      it('other well is empty', async () => {
        expect(wellplate.wells[1].sample).toBeUndefined();
      });
    });

    context('when collection id and samples list with three samples was given but wellplate is to small', async () => {
      const width = 1;
      const height = 2;
      const collectionId = 1;
      const samples = [sampleMock, sampleMock, sampleMock];

      it('an error was thrown', async () => {
        expect(() => Wellplate.buildFromSamplesAndCollectionId(samples, collectionId, width, height))
          .toThrowError('Size of wellplate to small for samples!');
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

  describe('title()', async () => {
    const wellplate = new Wellplate(wellplate8x12EmptyJson);

    context('with short label and name set', async () => {
      it('name and short label returned ', async () => {
        expect(wellplate.title()).toEqual('FM-WP1 Testwellplate');
      });
    });

    context('with name set but no short label', async () => {
      const wellplate = new Wellplate(wellplate8x12EmptyJson);
      wellplate.short_label = undefined;
      it('only name was returned', async () => {
        expect(wellplate.title()).toEqual(' Testwellplate');
      });
    });

    context('with short label set but no name', async () => {
      const wellplate = new Wellplate(wellplate8x12EmptyJson);
      wellplate.name = undefined;
      it('only short label was returned', async () => {
        expect(wellplate.title()).toEqual(wellplate.short_label);
      });
    });
    context('without short label and  name', async () => {
      const wellplate = new Wellplate(wellplate8x12EmptyJson);
      wellplate.name = undefined;
      wellplate.short_label = undefined;
      it('empty string was returned', async () => {
        expect(wellplate.title()).toEqual('');
      });
    });
  });
  describe('serialize()', async () => {
    const wellplate = new Wellplate(wellplate2x3EmptyJson);
    const segmentMock = {};
    segmentMock.serialize = () => 'mySegment';
    wellplate.segments = [segmentMock];

    context('with short label and name set', async () => {
      const wellplateSerialized = wellplate.serialize();
      it('properties of wellplate correct serialized', async () => {
        expect(wellplateSerialized.id).toEqual(1);
        expect(wellplateSerialized.is_new).toEqual(false);
        expect(wellplateSerialized.name).toEqual('Testwellplate 2x3');
        expect(wellplateSerialized.size).toEqual(6);
        expect(wellplateSerialized.description).toEqual('A test description for 2x3 plate');
        expect(wellplateSerialized.type).toEqual('wellplate');
        expect(wellplateSerialized.height).toEqual(3);
        expect(wellplateSerialized.width).toEqual(2);

        expect(wellplateSerialized.attachments).toBeUndefined();
        expect(wellplateSerialized.collection_id).toBeUndefined();
      });
      it('amount of serialized wells are 6', async () => {
        expect(wellplateSerialized.wells.length).toEqual(6);
      });
      it('amount of serialized segments are 1', async () => {
        expect(wellplateSerialized.segments.length).toEqual(1);
      });
    });
  });

  describe('size()', async () => {
    context('initalized with 2x3 (size = 6) and width changed to 3', async () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);
      wellplate.width = 3;
      it('size returns 9', async () => {
        expect(wellplate.size).toEqual(9);
      });
    });
  });
});
