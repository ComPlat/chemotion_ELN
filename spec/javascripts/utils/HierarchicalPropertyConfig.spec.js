import { describe, it } from 'mocha';
import assert from 'assert';

import {
  HIERARCHICAL_PROPERTY_OPTIONS,
  FIELD_DROPDOWN_OPTIONS,
  FIELD_UNIT_OPTIONS,
  PROPERTY_MAP,
  LENGTH_UNIT_FIELDS,
  DIMENSION_FIELDS,
} from '../../../app/javascript/src/utilities/hierarchicalPropertyConfig';

describe('hierarchicalPropertyConfig', () => {
  describe('HIERARCHICAL_PROPERTY_OPTIONS', () => {
    it('every option has a non-empty value and label', () => {
      HIERARCHICAL_PROPERTY_OPTIONS.forEach(({ value, label }) => {
        assert.ok(value, `option missing value`);
        assert.ok(label, `option missing label for value "${value}"`);
      });
    });

    it('includes the three new fields: layer_thickness, liquid_medium, stabilizer', () => {
      const values = HIERARCHICAL_PROPERTY_OPTIONS.map((o) => o.value);
      ['layer_thickness', 'liquid_medium', 'stabilizer'].forEach((f) => {
        assert.ok(values.includes(f), `${f} missing from HIERARCHICAL_PROPERTY_OPTIONS`);
      });
    });

    it('has correct labels for cspi and material', () => {
      const cspi = HIERARCHICAL_PROPERTY_OPTIONS.find((o) => o.value === 'cspi');
      assert.strictEqual(cspi.label, 'Cell density [CPSI]');
      const mat = HIERARCHICAL_PROPERTY_OPTIONS.find((o) => o.value === 'material');
      assert.strictEqual(mat.label, 'Monolith material');
    });

    it('has no duplicate values', () => {
      const values = HIERARCHICAL_PROPERTY_OPTIONS.map((o) => o.value);
      assert.strictEqual(new Set(values).size, values.length);
    });
  });

  describe('FIELD_UNIT_OPTIONS', () => {
    it('all dimension fields have unit options', () => {
      DIMENSION_FIELDS.forEach((f) => {
        assert.ok(FIELD_UNIT_OPTIONS[f]?.length > 0, `${f} missing unit options`);
      });
    });

    it('layer_thickness has µm and mm units', () => {
      const values = FIELD_UNIT_OPTIONS.layer_thickness.map((u) => u.value);
      assert.ok(values.includes('µm'));
      assert.ok(values.includes('mm'));
    });

    it('sieve_fraction retains original µm/mm unit options', () => {
      const values = FIELD_UNIT_OPTIONS.sieve_fraction.map((u) => u.value);
      assert.ok(values.includes('µm'));
      assert.ok(values.includes('mm'));
    });

    it('cspi has no unit options (rendered as dropdown)', () => {
      assert.strictEqual(FIELD_UNIT_OPTIONS.cspi, undefined);
    });

    it('liquid_medium and stabilizer have no unit options (plain text fields)', () => {
      assert.strictEqual(FIELD_UNIT_OPTIONS.liquid_medium, undefined);
      assert.strictEqual(FIELD_UNIT_OPTIONS.stabilizer, undefined);
    });
  });

  describe('FIELD_DROPDOWN_OPTIONS', () => {
    it('provides dropdown options for cspi, material, shape, and storage_condition', () => {
      ['cspi', 'material', 'shape', 'storage_condition'].forEach((f) => {
        assert.ok(
          FIELD_DROPDOWN_OPTIONS[f]?.length > 0,
          `${f} missing dropdown options`
        );
      });
    });

    it('cspi dropdown includes standard CPSI values', () => {
      const values = FIELD_DROPDOWN_OPTIONS.cspi.map((o) => o.value);
      ['300', '400', '500', '600'].forEach((v) => {
        assert.ok(values.includes(v), `cspi missing value ${v}`);
      });
    });
  });

  describe('LENGTH_UNIT_FIELDS', () => {
    it('includes sieve_fraction (original)', () => {
      assert.ok(LENGTH_UNIT_FIELDS.includes('sieve_fraction'));
    });

    it('includes layer_thickness (new)', () => {
      assert.ok(LENGTH_UNIT_FIELDS.includes('layer_thickness'));
    });

    it('includes all four dimension fields', () => {
      DIMENSION_FIELDS.forEach((f) => {
        assert.ok(LENGTH_UNIT_FIELDS.includes(f), `${f} missing from LENGTH_UNIT_FIELDS`);
      });
    });
  });

  describe('PROPERTY_MAP', () => {
    it('every HIERARCHICAL_PROPERTY_OPTIONS value has an entry', () => {
      HIERARCHICAL_PROPERTY_OPTIONS.forEach(({ value }) => {
        assert.ok(PROPERTY_MAP[value], `PROPERTY_MAP missing "${value}"`);
      });
    });
  });
});
