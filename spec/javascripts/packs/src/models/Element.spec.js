import expect from 'expect';
// eslint-disable-next-line import/no-unresolved
import ElementFactory from 'factories/ElementFactory';
import {
  describe, it,
  beforeEach, afterEach
} from 'mocha';

import Container from 'src/models/Container';

describe('Element', () => {
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
