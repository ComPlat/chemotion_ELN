import ChemSpectraFetcher from 'src/fetchers/ChemSpectraFetcher';
import 'whatwg-fetch';
import expect from 'expect';
import sinon from 'sinon';

describe('ChemSpectraFetcher methods', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('fetchSpectraLayouts', () => {
    it('should fetch spectra layouts', async () => {
      const expectedResponse = {
        datatypes: {
          'CIRCULAR DICHROISM SPECTROSCOPY': ['CIRCULAR DICHROISM SPECTROSCOPY'],
          'CYCLIC VOLTAMMETRY': ['CYCLIC VOLTAMMETRY'],
        },
      };

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse), { status: 200 }));

      const response = await ChemSpectraFetcher.fetchSpectraLayouts();

      sinon.assert.calledOnce(fetchStub);
      expect(response).toEqual(expectedResponse);
    });

    it('should throw an error when GET Spectra Layouts request fails', async () => {
      fetchStub.resolves(new Response(null, { status: 404 }));

      const response = await ChemSpectraFetcher.fetchSpectraLayouts();

      sinon.assert.calledOnce(fetchStub);
      expect(response).toBeNull();
    });
  });

  describe('updateDataTypes', () => {
    const newDataTypes = {
      'CIRCULAR DICHROISM SPECTROSCOPY': ['CIRCULAR DICHROISM SPECTROSCOPY'],
      'CYCLIC VOLTAMMETRY': ['CYCLIC VOLTAMMETRY'],
    };

    it('should update data types', async () => {
      const expectedResponse = {
        message: 'Data types updated',
      };

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse), { status: 200 }));

      const response = await ChemSpectraFetcher.updateDataTypes(newDataTypes);

      sinon.assert.calledOnce(fetchStub);
      expect(response).toEqual(expectedResponse);
    });

    it('should handle update data types fetch error', async () => {
      fetchStub.rejects(new Error('Fetch error'));

      try {
        await ChemSpectraFetcher.updateDataTypes(newDataTypes);
        throw new Error('Failed to handle fetch error');
      } catch (error) {
        sinon.assert.calledOnce(fetchStub);
        expect(error.message).toEqual('Failed to handle fetch error');
      }
    });
  });

  describe('fetchUpdatedSpectraLayouts', () => {
    it('should fetch updated spectra layouts mapping', async () => {
      const expectedResponse = {
        datatypes: {
          'CIRCULAR DICHROISM SPECTROSCOPY': ['CIRCULAR DICHROISM SPECTROSCOPY'],
          'CYCLIC VOLTAMMETRY': ['CYCLIC VOLTAMMETRY'],
        },
      };

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse), { status: 200 }));

      const response = await ChemSpectraFetcher.fetchUpdatedSpectraLayouts();

      sinon.assert.calledOnce(fetchStub);
      expect(response).toEqual(Object.entries(expectedResponse.datatypes));
    });

    it('requests the static /data_type.json asset (not the routeless /data_type)', async () => {
      fetchStub.resolves(new Response(JSON.stringify({ datatypes: {} }), { status: 200 }));

      await ChemSpectraFetcher.fetchUpdatedSpectraLayouts();

      sinon.assert.calledOnce(fetchStub);
      // Regression guard: the asset is public/data_type.json; GET /data_type 404s (no route).
      expect(fetchStub.firstCall.args[0]).toEqual('/data_type.json');
    });

    it('should handle fetch failure', async () => {
      fetchStub.resolves(new Response(null, { status: 404 }));
      try {
        await ChemSpectraFetcher.fetchUpdatedSpectraLayouts();
        throw new Error('Failed to handle fetch error');
      } catch (error) {
        sinon.assert.calledOnce(fetchStub);
        expect(error.message).toEqual('Failed to fetch JSON');
      }
    });
  });
});
