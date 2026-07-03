import expect from 'expect';
import { describe, it, beforeEach, afterEach } from 'mocha';
import sinon from 'sinon';

import alt from 'src/stores/alt/alt';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplatesFetcher from 'src/fetchers/TextTemplatesFetcher';

describe('TextTemplateStore', () => {
  beforeEach(() => {
    alt.flush();
    sinon.restore();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('initial state', () => {
    it('has empty personalTemplates', () => {
      expect(TextTemplateStore.getState().personalTemplates).toEqual([]);
    });

  });

  describe('fetchPersonalTemplates action', () => {
    it('dispatches fetched templates to personalTemplates state', (done) => {
      const templates = [
        { id: 1, name: 'My Template', data: { ops: [] } },
        { id: 2, name: 'Another', data: { ops: [] } },
      ];
      sinon.stub(TextTemplatesFetcher, 'fetchPersonalTemplates').resolves(templates);

      TextTemplateActions.fetchPersonalTemplates();

      setTimeout(() => {
        expect(TextTemplateStore.getState().personalTemplates).toEqual(templates);
        done();
      }, 50);
    });

    it('sets personalTemplates to empty array when fetch returns null', (done) => {
      sinon.stub(TextTemplatesFetcher, 'fetchPersonalTemplates').resolves(null);

      TextTemplateActions.fetchPersonalTemplates();

      setTimeout(() => {
        expect(TextTemplateStore.getState().personalTemplates).toEqual([]);
        done();
      }, 50);
    });

    it('replaces existing personalTemplates on re-fetch', (done) => {
      sinon.stub(TextTemplatesFetcher, 'fetchPersonalTemplates')
        .onFirstCall().resolves([{ id: 1, name: 'Old', data: {} }])
        .onSecondCall().resolves([{ id: 2, name: 'New', data: {} }]);

      TextTemplateActions.fetchPersonalTemplates();

      setTimeout(() => {
        TextTemplateActions.fetchPersonalTemplates();
        setTimeout(() => {
          expect(TextTemplateStore.getState().personalTemplates).toEqual([{ id: 2, name: 'New', data: {} }]);
          done();
        }, 50);
      }, 50);
    });
  });


});
