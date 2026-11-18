import { describe, it } from 'mocha';
import assert from 'assert';

import {
  getMetricPrefix,
  getMetricMol,
  getMetricMolConc,
  metricPrefixesMol,
  metricPrefixesMolConc,
} from '../../../app/javascript/src/utilities/MetricsUtils';

describe('MetricsUtils', () => {
  describe('metricPrefixesMol', () => {
    it('includes milli prefix', () => {
      assert.ok(metricPrefixesMol.includes('m'));
    });

    it('includes micro prefix (u) for µmol support', () => {
      assert.ok(metricPrefixesMol.includes('u'));
    });

    it('includes none prefix (n) for base mol unit', () => {
      assert.ok(metricPrefixesMol.includes('n'));
    });
  });

  describe('getMetricPrefix', () => {
    it('returns micro prefix when metrics[index] is u', () => {
      const result = getMetricPrefix(['m', 'm', 'u'], 2, metricPrefixesMol, 'm');
      assert.strictEqual(result, 'u');
    });

    it('returns milli prefix when metrics[index] is m', () => {
      const result = getMetricPrefix(['m', 'm', 'm'], 2, metricPrefixesMol, 'u');
      assert.strictEqual(result, 'm');
    });

    it('returns default when prefix not in validPrefixes', () => {
      const result = getMetricPrefix(['m', 'm', 'k'], 2, metricPrefixesMol, 'm');
      assert.strictEqual(result, 'm');
    });

    it('returns default when metrics is too short', () => {
      const result = getMetricPrefix(['m'], 2, metricPrefixesMol, 'm');
      assert.strictEqual(result, 'm');
    });
  });

  describe('getMetricMol', () => {
    it('returns micro prefix (u) for µmol from metrics index 2', () => {
      const component = { metrics: ['m', 'm', 'u', 'm'] };
      assert.strictEqual(getMetricMol(component), 'u');
    });

    it('returns default m when metrics are missing', () => {
      const component = {};
      assert.strictEqual(getMetricMol(component), 'm');
    });
  });

  describe('getMetricMolConc', () => {
    it('returns the prefix at metrics index 3', () => {
      const component = { metrics: ['m', 'm', 'm', 'n'] };
      assert.strictEqual(getMetricMolConc(component), 'n');
    });

    it('returns default m when metrics are missing', () => {
      const component = {};
      assert.strictEqual(getMetricMolConc(component), 'm');
    });
  });
});
