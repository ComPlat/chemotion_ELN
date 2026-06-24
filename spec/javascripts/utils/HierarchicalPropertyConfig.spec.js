import { describe, it } from 'mocha';
import assert from 'assert';

import {
  HIERARCHICAL_PROPERTY_OPTIONS,
  FIELD_DROPDOWN_OPTIONS,
  FIELD_UNIT_OPTIONS,
  PROPERTY_MAP,
  LENGTH_UNIT_FIELDS,
  DIMENSION_FIELDS,
  TEMP_FIELDS,
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

    it('preserves original labels for pre-existing fields', () => {
      const cspi = HIERARCHICAL_PROPERTY_OPTIONS.find((o) => o.value === 'cspi');
      assert.strictEqual(cspi.label, 'CSPI');
      const mat = HIERARCHICAL_PROPERTY_OPTIONS.find((o) => o.value === 'material');
      assert.strictEqual(mat.label, 'Material');
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

    it('cspi uses temperature units (original behaviour)', () => {
      const values = FIELD_UNIT_OPTIONS.cspi.map((u) => u.value);
      assert.ok(values.includes('°C'));
      assert.ok(values.includes('K'));
    });

    it('liquid_medium and stabilizer have no unit options (plain text fields)', () => {
      assert.strictEqual(FIELD_UNIT_OPTIONS.liquid_medium, undefined);
      assert.strictEqual(FIELD_UNIT_OPTIONS.stabilizer, undefined);
    });
  });

  describe('FIELD_DROPDOWN_OPTIONS', () => {
    it('is empty — no pre-existing fields are overridden with dropdowns', () => {
      assert.strictEqual(Object.keys(FIELD_DROPDOWN_OPTIONS).length, 0);
    });
  });

  describe('TEMP_FIELDS', () => {
    it('contains cspi (original behaviour)', () => {
      assert.ok(TEMP_FIELDS.includes('cspi'));
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
