import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';
import expect from 'expect';
import sinon from 'sinon';
describe('ChemicalFetcher methods', () => {
  let fetchStub;

  beforeEach(() => {
    // Create a stub for the fetch method
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    // Restore the original fetch method after each test
    fetchStub.restore();
  });

  describe('fetch chemical', () => {
    const sampleId = 19;
    it('should fetch chemical', async () => {
      const expectedResponse = {
        id: 1,
        cas: '50-00-0',
        chemical_data: [{ price: '30' }],
        sample_id: 19
      };

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await ChemicalFetcher.fetchChemical(sampleId, 'sample');

      sinon.assert.calledOnce(fetchStub);
      expect(result.id).toEqual(expectedResponse.id);
      expect(result.cas).toEqual(expectedResponse.cas);
      expect(result.chemical_data).toEqual(expectedResponse.chemical_data);
    });
  });

  describe('create', () => {
    const inputData = {
      cas: '50-00-0',
      chemical_data: [{ status: 'Out of stock' }],
      sample_id: 19
    };
    it('should create a new chemical', async () => {
      const expectedResponse = {
        id: 1,
        cas: '50-00-0',
        chemical_data: [{ status: 'Out of stock' }],
        sample_id: 19
      };

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await ChemicalFetcher.create(inputData);

      sinon.assert.calledOnce(fetchStub);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle fetch error', async () => {
      // Stub ChemicalFetcher.create
      const createStub = sinon.stub(ChemicalFetcher, 'create').callsFake(async (input) => {
        await fetch('/api/v1/chemicals/create', {
          credentials: 'same-origin',
          method: 'post',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(input)
        });
      });
      // Setup fetchStub to reject with a specific error
      fetchStub.rejects(new Error('Fetch error'));
      try {
        await ChemicalFetcher.create(inputData);
        // If the code execution reaches here, the test should fail
        throw new Error('Failed to create chemical');
      } catch (error) {
        // Restore original method
        createStub.restore();
        sinon.assert.calledOnce(fetchStub);
        expect(error.message).toEqual('Fetch error');
      }
    });
  });

  describe('update', () => {
    const params = {
      cas: '50-00-0',
      chemical_data: [{ status: 'Out of stock' }],
      sample_id: 19,
      type: 'sample'
    };
    it('should update chemical entry', async () => {
      const expectedResponse = {
        id: 1,
        cas: '50-00-0',
        chemical_data: [{ status: 'Out of stock' }],
        sample_id: 19
      };

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await ChemicalFetcher.update(params);

      const { type, ...expectedBody } = params;
      sinon.assert.calledOnce(fetchStub);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('fetchSafetySheets', () => {
    const queryParams = {
      id: 1,
      vendor: 'Merck',
      queryOption: 'cas',
      language: 'en',
      string: '50-00-0'
    };
    it('should fetch safety data sheets', async () => {
      const expectedResponse = {
        merck_link: {
          merck_link: 'https://www.sigmaaldrich.com/DE/en/sds/sial/252549',
          merck_product_link: 'https://www.sigmaaldrich.com/US/en/product/sial/252549',
          merck_product_number: '252549'
        }
      };

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await ChemicalFetcher.fetchSafetySheets(queryParams);
      const resultObject = JSON.parse(result); // Parse the received response as JSON

      sinon.assert.calledOnce(fetchStub);
      expect(resultObject).toEqual(expectedResponse);
    });
  });

  describe('saveSafetySheets', () => {
    const inputData = {
      cas: '50-00-0',
      chemical_data: [{ status: 'Out of stock' }],
      sample_id: 19,
      vendor_product: 'merckProductInfo'
    };
    it('should save safety data sheet', async () => {
      const expectedResponse = true;

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await ChemicalFetcher.saveSafetySheets(inputData);

      sinon.assert.calledOnce(fetchStub);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('saveManualAttachedSafetySheet', () => {
    const inputParams = {
      sample_id: 19,
      cas: '50-00-0',
      chemical_data: [{ status: 'Out of stock' }],
      vendor_product: 'merckProductInfo',
      attached_file: {
        filename: 's41597-023-02501-8.pdf',
        type: 'application/pdf',
        name: 'attached_file',
        tempfile: new File(['mock file content'], 's41597-023-02501-8.pdf', { type: 'application/pdf' }),
        head: `Content-Disposition: form-data; name="attached_file"; filename="s41597-023-02501-8.pdf"
        Content-Type: application/pdf\r\n`
      }
    };

    it('should save manual attached safety sheet', async () => {
      const expectedResponse = true;

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await ChemicalFetcher.saveManualAttachedSafetySheet(inputParams);

      // Assert that fetch was called once with the correct parameters
      sinon.assert.calledOnce(fetchStub);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle fetch error', async () => {
      // Setup fetchStub to reject with a specific error
      fetchStub.rejects(new Error('Fetch error'));

      try {
        await ChemicalFetcher.saveManualAttachedSafetySheet(inputParams);
        throw new Error('Failed to save manual attached safety sheet');
      } catch (error) {
        expect(error.message).toEqual('Failed to save manual attached safety sheet');
      }
    });
  });

  describe('extractFromSds', () => {
    const sheetPath = '/safety_sheets/merck/392693_c4f307a89d9fd8c2.pdf';

    it('should read phrases and properties out of a saved sheet', async () => {
      const expectedResponse = {
        safetyPhrases: {
          h_statements: { H225: ' Highly flammable liquid and vapour.' },
          p_statements: {},
          pictograms: []
        },
        properties: { flash_point: '4 °C' },
        diagnostics: { notes: [], errors: [] }
      };

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await ChemicalFetcher.extractFromSds(sheetPath);

      sinon.assert.calledOnce(fetchStub);
      expect(result).toEqual(expectedResponse);
    });
  });
});
