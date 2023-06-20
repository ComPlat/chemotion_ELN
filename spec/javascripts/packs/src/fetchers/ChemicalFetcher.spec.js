import ChemicalFetcher from 'src/fetchers/ChemicalFetcher';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

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

      const result = await ChemicalFetcher.fetchChemical(sampleId);

      sinon.assert.calledOnce(fetchStub);
      sinon.assert.calledWithExactly(fetchStub, `/api/v1/chemicals?sample_id=${sampleId}`, {
        credentials: 'same-origin',
      });
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
      sinon.assert.calledWithExactly(fetchStub, '/api/v1/chemicals/create', {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inputData)
      });

      expect(result).toEqual(expectedResponse);
    });

    it('should handle fetch error', async () => {
      // Call the create method of ChemicalFetcher and catch the error
      fetchStub.rejects(new Error('Fetch error'));
      try {
        await ChemicalFetcher.create(inputData);
        // If the code execution reaches here, the test should fail
        throw new Error('Failed to create chemical');
      } catch (error) {
        sinon.assert.calledOnce(fetchStub);
        sinon.assert.calledWithExactly(fetchStub, '/api/v1/chemicals/create', {
          credentials: 'same-origin',
          method: 'post',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(inputData)
        });
        expect(error.message).toEqual('Failed to create chemical');
      }
    });
  });

  describe('update', () => {
    const params = {
      cas: '50-00-0',
      chemical_data: [{ status: 'Out of stock' }],
      sample_id: 19
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

      sinon.assert.calledOnce(fetchStub);
      sinon.assert.calledWithExactly(fetchStub, `/api/v1/chemicals/${params.sample_id}`, {
        credentials: 'same-origin',
        method: 'put',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });
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
      sinon.assert.calledWithExactly(fetchStub, `/api/v1/chemicals/fetch_safetysheet/${queryParams.id}?data[vendor]=${queryParams.vendor}&data[option]=${queryParams.queryOption}&data[language]=${queryParams.language}&data[searchStr]=${queryParams.string}`, {
        credentials: 'same-origin',
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      });
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
      sinon.assert.calledWithExactly(fetchStub, '/api/v1/chemicals/save_safety_datasheet', {
        credentials: 'same-origin',
        method: 'post',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inputData)
      });

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('safety phrases', () => {
    const queryParams = {
      vendor: 'Merck',
      id: 19
    };
    it('should fetch safety phrases', async () => {
      const expectedResponse = {
        h_statements: {
          H226: ' Flammable liquid and vapour',
          H314: ' Causes severe skin burns and eye damage',
          H317: ' May cause an allergic skin reaction',
          H330: ' Fatal if inhaled',
          H335: ' May cause respiratory irritation',
          H341: ' Suspected of causing genetic defects',
          H350: ' May cause cancer',
          H370: ' Causes damage to organs'
        },
        p_statements: {
          P201: ' Obtain special instructions before use.',
          P210: ' Keep away from heat, hot surfaces, sparks, open flames and other ignition sources. No smoking. [As modified by IV ATP]',
          P280: ' Wear protective gloves/protective clothing/eye protection/face protection. [As modified by IV ATP]'
        },
        pictograms: [
          'GHS02',
          'GHS05',
          'GHS06',
          'GHS08'
        ]
      };

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await ChemicalFetcher.safetyPhrases(queryParams);

      sinon.assert.calledOnce(fetchStub);
      sinon.assert.calledWithExactly(fetchStub, `/api/v1/chemicals/safety_phrases/${queryParams.id}?vendor=${queryParams.vendor}`, {
        credentials: 'same-origin',
        method: 'GET'
      });
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('chemicalProperties', () => {
    const productLink = 'https://www.sigmaaldrich.com/US/en/product/sial/252549';
    it('should fetch chemical properties', async () => {
      const expectedResponse = {
        grade: 'ACS reagent',
        quality_level: '200',
        vapor_density: '1.03 (vs air)',
        vapor_pressure: '52 mmHg ( 37 °C)52 mmHg ( 37 °C)',
        form: 'liquid'
      };

      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await ChemicalFetcher.chemicalProperties(productLink);

      sinon.assert.calledOnce(fetchStub);
      sinon.assert.calledWithExactly(fetchStub, `/api/v1/chemicals/chemical_properties?link=${productLink}`, {
        credentials: 'same-origin',
        method: 'GET'
      });
      expect(result).toEqual(expectedResponse);
    });
  });
});
