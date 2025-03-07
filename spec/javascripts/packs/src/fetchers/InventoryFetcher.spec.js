import InventoryFetcher from '@src/fetchers/InventoryFetcher';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

describe('InventoryFetcher methods', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('updateInventoryLabel', () => {
    const params = {
      prefix: 'BCN',
      name: 'Bräse North Camp',
      counter: 1,
      collection_ids: [10]
    };
    const expectedResponse = [
      {
        collections: [
          {
            id: 10,
            label: 'chemotion-repository.net'
          },
          {
            id: 16,
            label: 'project CU1-lavender'
          },
        ],
        inventory: {
          id: 3,
          prefix: 'BCN',
          name: 'Bräse North Camp',
          counter: 1,
        }
      },
    ];

    it('should update sample inventory label for a user', async () => {
      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await InventoryFetcher.updateInventoryLabel(params);

      sinon.assert.calledOnce(fetchStub);
      sinon.assert.calledWithExactly(fetchStub, '/api/v1/inventory/update_inventory_label', {
        credentials: 'same-origin',
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });
      expect(result).not.toBeNull();
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('fetchLabelsAndCollections', () => {
    const expectedResponse = [
      {
        collections: [
          {
            id: 10,
            label: 'chemotion-repository.net'
          },
          {
            id: 16,
            label: 'project CU1-lavender'
          },
        ],
        inventory: {
          id: 3,
          prefix: 'BCN',
          name: 'Bräse North Camp',
          counter: 1,
        }
      },
    ];

    it('should fetch user inventory labels and collections', async () => {
      fetchStub.resolves(new Response(JSON.stringify(expectedResponse)));

      const result = await InventoryFetcher.fetchLabelsAndCollections();

      sinon.assert.calledOnce(fetchStub);
      sinon.assert.calledWithExactly(fetchStub, '/api/v1/inventory/user_inventory_collections', {
        credentials: 'same-origin',
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('fetchInventoryOfCollection', () => {
    const ExpectedInventory = {
      id: 1,
      prefix: 'BCN',
      name: 'IBCS North Camp',
      counter: 1,
    };
    const collectionId = 2;
    it('should fetch inventory label and counter', async () => {
      fetchStub.resolves(new Response(JSON.stringify(ExpectedInventory)));

      const result = await InventoryFetcher.fetchInventoryOfCollection(collectionId);

      sinon.assert.calledOnce(fetchStub);
      sinon.assert.calledWithExactly(fetchStub, `/api/v1/inventory/${collectionId}`, {
        credentials: 'same-origin',
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      expect(result).toEqual(ExpectedInventory);
    });
  });
});
