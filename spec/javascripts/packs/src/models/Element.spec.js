import expect from 'expect';
import Element from 'src/models/Element';
// eslint-disable-next-line import/no-unresolved
import ElementFactory from 'factories/ElementFactory';
import {
  describe, it,
  beforeEach, afterEach
} from 'mocha';

import Container from 'src/models/Container';

describe('Element', () => {
  describe('isReadOnly', () => {
    it('is read-only only when the backend sends an explicit can_update: false', () => {
      const element = new Element({ id: 1, can_update: false });
      expect(element.isReadOnly).toEqual(true);
    });

    it('is editable when can_update is true', () => {
      const element = new Element({ id: 1, can_update: true });
      expect(element.isReadOnly).toEqual(false);
    });

    it('is editable when the backend omits can_update (undefined defaults to editable)', () => {
      const element = new Element({ id: 1 });
      expect(element.isReadOnly).toEqual(false);
    });
  });

  describe('Element.getAnalysisContainersComparable()', () => {
    describe('when element is sample', () => {
      const element = ElementFactory.createElement('sample');
      let analysis;
      const analysisContainer = Container.buildAnalysis();
      analysisContainer.extended_metadata.kind = 'NMR';

      beforeEach(() => {
        const analysesContainer = element.analysesContainers();
        analysesContainer[0].children.push(analysisContainer);
        analysis = element.getAnalysisContainersComparable();
      });

      afterEach(() => {
        const analysesContainer = element.analysesContainers();
        analysesContainer[0].children = [];
      });

      it('it always returns a object', () => {
        expect(analysis).not.toBeNull();
      });

      it('it has comparable container', () => {
        const expectedValue = { NMR: [analysisContainer] };
        expect(analysis).toEqual(expectedValue);
      });
    });
  });
});
