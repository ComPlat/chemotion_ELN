/* eslint-disable no-undef,no-shadow */
import expect from 'expect';
import {
  describe, it
} from 'mocha';
import Wellplate from '@src/models/Wellplate';
import wellplate2x3EmptyJson from '@tests/fixture/wellplates/wellplate_2_3_empty';
import wellplate8x12EmptyJson from '@tests/fixture/wellplates/wellplate_8_12_empty';
import wellplate2x2fromServer from '@tests/fixture/wellplates/wellplate_2_2_from_server';

describe('Wellplate', () => {
  const sampleMock = {};
  sampleMock.buildChild = () => ({ wasCopied: 'yes' });

  describe('constructor()', () => {
    context('when file was fetched from server', () => {
      const wellplate = new Wellplate(wellplate2x2fromServer);
      it('created a wellplate of size 2 x 3', () => {
        expect(wellplate.size).toEqual(4);
        expect(wellplate.height).toEqual(2);
        expect(wellplate.width).toEqual(2);
        expect(wellplate.wells.length).toEqual(4);
      });
    });

    context('when input is valid and has dimension 2x3 and has no samples in wells', () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);

      it('created a wellplate of size 2 x 3', () => {
        expect(wellplate.size).toEqual(6);
        expect(wellplate.height).toEqual(3);
        expect(wellplate.width).toEqual(2);
      });

      it('created wellplate has 6 wells with correct positions', () => {
        expect(wellplate.wells.length).toEqual(6);
        expect(wellplate.wells[5].position).toEqual({ x: 2, y: 3 });
      });
    });
    context('when input is valid and has dimesion 12x8 and has no samples in wells', () => {
      const wellplate = new Wellplate(wellplate8x12EmptyJson);

      it('created a wellplate of size 12 x 8', () => {
        expect(wellplate.size).toEqual(96);
        expect(wellplate.height).toEqual(8);
        expect(wellplate.width).toEqual(12);
      });

      it('created wellplate has 96 wells with correct positions', () => {
        expect(wellplate.wells.length).toEqual(96);
      });
    });
  });

  describe('buildEmpty()', () => {
    context('when only collection id was given', () => {
      const collectionId = 1;
      const wellplate = Wellplate.buildEmpty(collectionId);

      it('created a wellplate of size 12 x 8', () => {
        expect(wellplate.size).toEqual(96);
        expect(wellplate.height).toEqual(8);
        expect(wellplate.width).toEqual(12);
      });
    });

    context('when collection id was given and size set to 5x6', () => {
      const collectionId = 1;
      const width = 5;
      const height = 6;
      const wellplate = Wellplate.buildEmpty(collectionId, width, height);

      it('created a wellplate of size 12 x 8', () => {
        expect(wellplate.size).toEqual(30);
        expect(wellplate.height).toEqual(height);
        expect(wellplate.width).toEqual(width);
      });
    });
  });

  describe('buildFromSamplesAndCollectionId()', () => {
    context('when only collection id and empty samples list was given', () => {
      const collectionId = 1;
      const samples = [];
      const wellplate = Wellplate.buildFromSamplesAndCollectionId(samples, collectionId);

      it('created a wellplate of size 12 x 8', () => {
        expect(wellplate.size).toEqual(96);
        expect(wellplate.height).toEqual(8);
        expect(wellplate.width).toEqual(12);
      });

      it('96 empty wells should be created', () => {
        expect(wellplate.wells.length).toEqual(96);
      });
    });

    context('when collection id and dimension [7x3] was given and empty samples list was given', () => {
      const collectionId = 1;
      const samples = [];
      const width = 7;
      const height = 3;
      const wellplate = Wellplate.buildFromSamplesAndCollectionId(samples, collectionId, width, height);

      it('created a wellplate of size 7 x 3', () => {
        expect(wellplate.size).toEqual(width * height);
        expect(wellplate.height).toEqual(height);
        expect(wellplate.width).toEqual(width);
      });
    });

    context('when collection id and samples list with one samples was given', () => {
      const width = 1;
      const height = 2;
      const collectionId = 1;
      const samples = [sampleMock];
      const wellplate = Wellplate.buildFromSamplesAndCollectionId(samples, collectionId, width, height);

      it('Two wells should be created', () => {
        expect(wellplate.wells.length).toEqual(2);
      });

      it('sample was put in well [1;1]', () => {
        expect(wellplate.wells[0].sample.wasCopied).toEqual('yes');
        console.log(wellplate.wells[0].position);
        expect(wellplate.wells[0].position).toEqual({ x: 1, y: 1 });
      });

      it('other well is empty', () => {
        expect(wellplate.wells[1].sample).toBeUndefined();
      });
    });

    context('when collection id and samples list with three samples was given but wellplate is to small', () => {
      const width = 1;
      const height = 2;
      const collectionId = 1;
      const samples = [sampleMock, sampleMock, sampleMock];

      it('an error was thrown', () => {
        expect(() => Wellplate.buildFromSamplesAndCollectionId(samples, collectionId, width, height))
          .toThrow();
      });
    });
  });

  describe('title()', () => {
    const wellplate = new Wellplate(wellplate8x12EmptyJson);

    context('with short label and name set', () => {
      it('name and short label returned ', () => {
        expect(wellplate.title()).toEqual('FM-WP1 Testwellplate');
      });
    });

    context('with name set but no short label', () => {
      const wellplate = new Wellplate(wellplate8x12EmptyJson);
      wellplate.short_label = undefined;
      it('only name was returned', () => {
        expect(wellplate.title()).toEqual(' Testwellplate');
      });
    });

    context('with short label set but no name', () => {
      const wellplate = new Wellplate(wellplate8x12EmptyJson);
      wellplate.name = undefined;
      it('only short label was returned', () => {
        expect(wellplate.title()).toEqual(wellplate.short_label);
      });
    });
    context('without short label and  name', () => {
      const wellplate = new Wellplate(wellplate8x12EmptyJson);
      wellplate.name = undefined;
      wellplate.short_label = undefined;
      it('empty string was returned', () => {
        expect(wellplate.title()).toEqual('');
      });
    });
  });
  describe('serialize()', () => {
    const wellplate = new Wellplate(wellplate2x3EmptyJson);
    const segmentMock = {};
    segmentMock.serialize = () => 'mySegment';
    wellplate.segments = [segmentMock];

    context('with short label and name set', () => {
      const wellplateSerialized = wellplate.serialize();
      it('properties of wellplate correct serialized', () => {
        expect(wellplateSerialized.id).toEqual(1);
        expect(wellplateSerialized.is_new).toEqual(true);
        expect(wellplateSerialized.name).toEqual('Testwellplate 2x3');
        expect(wellplateSerialized.size).toEqual(6);
        expect(wellplateSerialized.description).toEqual('A test description for 2x3 plate');
        expect(wellplateSerialized.type).toEqual('wellplate');
        expect(wellplateSerialized.height).toEqual(3);
        expect(wellplateSerialized.width).toEqual(2);

        expect(wellplateSerialized.attachments).toBeUndefined();
        expect(wellplateSerialized.collection_id).toBeUndefined();
      });
      it('amount of serialized wells are 6', () => {
        expect(wellplateSerialized.wells.length).toEqual(6);
      });
      it('amount of serialized segments are 1', () => {
        expect(wellplateSerialized.segments.length).toEqual(1);
      });
    });
  });

  describe('get size()', () => {
    context('initalized with 2x3 (size = 6) and width changed to 3', () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);
      wellplate.width = 3;
      it('size returns 9', () => {
        expect(wellplate.size).toEqual(9);
      });
    });
  });

  describe('changeSize()', () => {
    context('initalized with 2x3 (size = 6) and size changed to 3x4', () => {
      const wellplate = new Wellplate(wellplate2x3EmptyJson);
      wellplate.changeSize(3, 4);
      it('height, width and number of wells are adapted', () => {
        expect(wellplate.width).toEqual(3);
        expect(wellplate.height).toEqual(4);
        expect(wellplate.wells.length).toEqual(12);
      });
    });

    context('build with 1 sample and increase size', () => {
      const width = 1;
      const height = 2;
      const collectionId = 1;
      const samples = [sampleMock];
      const wellplate = Wellplate.buildFromSamplesAndCollectionId(samples, collectionId, width, height);

      wellplate.changeSize(3, 4);
      it('sample can be found in wells', () => {
        expect(wellplate.wells[0].sample).not.toBeUndefined();
      });
    });

    context('wellplate with two samples decrease size to 1x1', () => {
      const width = 1;
      const height = 2;
      const collectionId = 1;
      const samples = [sampleMock, sampleMock];
      const wellplate = Wellplate.buildFromSamplesAndCollectionId(samples, collectionId, width, height);

      it('does not throw an error and number of wells is 1', () => {
        expect(() => wellplate.changeSize(1, 1)).not.toThrow();
        expect(wellplate.wells.length).toEqual(1);
        expect(wellplate.wells[0].sample).not.toBeUndefined();
      });
    });

    context('wellplate with size 5x4 and with well at position 3x2 changed size to 4x3', () => {
      const width = 5;
      const height = 4;
      const collectionId = 1;
      const wellplate = Wellplate.buildEmpty(collectionId, width, height);

      wellplate.changeSize(5, 4);
      wellplate.wells[7].sample = sampleMock; // set sample in well at index 7 = 3x2

      wellplate.changeSize(4, 3);

      it('well with sample remains at position 3x2', () => {
        expect(wellplate.wells[6].sample).not.toBeUndefined();
      });
    });
  });
});
