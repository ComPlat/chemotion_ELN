import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';

describe('ComponentsFetcher methods', () => {
  let fetchStub;

  beforeEach(() => {
    fetchStub = sinon.stub(global, 'fetch');
  });

  afterEach(() => {
    fetchStub.restore();
  });

  describe('fetchComponentsBySampleId', () => {
    it('should fetch components successfully', async () => {
      const expectedResponse = [{ id: 1, name: 'Component A' }];
      fetchStub.resolves(new Response(JSON.stringify(expectedResponse), { status: 200 }));

      const result = await ComponentsFetcher.fetchComponentsBySampleId(123);

      sinon.assert.calledOnce(fetchStub);
      sinon.assert.calledWithExactly(fetchStub, '/api/v1/components/123', {
        credentials: 'same-origin',
      });
      // expect(fetchStub.calledWithExactly('/api/v1/components/123',
      //   sinon.match({ credentials: 'same-origin' }))).toBe(true);

      expect(result).toEqual(expectedResponse);
    });

    it('should throw an error when the response is not ok', async () => {
      fetchStub.resolves(new Response('', { status: 500 }));

      const result = await ComponentsFetcher.fetchComponentsBySampleId(123);
      expect(result).toBeUndefined();
      expect(fetchStub.calledOnce).toBe(true);
    });
  });

  describe('saveOrUpdateComponents', () => {
    it('should save or update components successfully', async () => {
      const sample = { id: 456 };
      const components = [{ serializeComponent: () => ({ id: 1, name: 'Component B' }) }];
      const mockResponse = { success: true };

      fetchStub.resolves(new Response(JSON.stringify(mockResponse), { status: 200 }));

      const result = await ComponentsFetcher.saveOrUpdateComponents(sample, components);

      expect(fetchStub.calledWith('/api/v1/components', {
        credentials: 'same-origin',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample_id: sample.id, components: [{ id: 1, name: 'Component B' }] })
      })).toBe(true);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors when saving/updating components fails', async () => {
      const sample = { id: 789 };
      const components = [{ serializeComponent: () => ({ id: 2, name: 'Component C' }) }];

      fetchStub.resolves(new Response('', { status: 400 }));

      const result = await ComponentsFetcher.saveOrUpdateComponents(sample, components);
      expect(result).toBeUndefined();
      expect(fetchStub.calledOnce).toBe(true);
    });
  });
});
