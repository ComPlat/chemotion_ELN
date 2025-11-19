import expect from 'expect';
import SampleFactory from 'factories/SampleFactory';
import Sample from 'src/models/Sample.js';
import Component from 'src/models/Component';

describe('Sample', async () => {
  const referenceSample = await SampleFactory.build('SampleFactory.water_100g');
  const product = await SampleFactory.build('SampleFactory.water_100g');

  describe('Sample.calculateMaxAmount()', () => {
    context('when input is valid', () => {
      it('returns amount of 100', () => {
        product.coefficient = 1;
        referenceSample.coefficient = 1;
        product.calculateMaxAmount(referenceSample);

        expect(product.maxAmount).toBeCloseTo(100, 5);
      });
    });

    context('when product coefficient is two', () => {
      it('returns amount of 200', () => {
        product.coefficient = 2;
        referenceSample.coefficient = 1;
        product.calculateMaxAmount(referenceSample);
        expect(product.maxAmount).toBeCloseTo(200, 5);
      });
    });

    context('when product coefficient is zero', () => {
      it('amount is 100 because zero coefficient was set to one', () => {
        product.coefficient = 0;
        referenceSample.coefficient = 1;
        product.calculateMaxAmount(referenceSample);
        expect(product.maxAmount).toBeCloseTo(100, 5);
      });
    });

    context('when reference coefficient is four', () => {
      it('returns amount of 25', () => {
        product.coefficient = 1;
        referenceSample.coefficient = 4;
        product.calculateMaxAmount(referenceSample);

        expect(product.maxAmount).toBeCloseTo(25, 5);
      });
    });
  });

  describe('Sample.copyFromSampleAndCollectionId()', () => {
    it('should copy amount_value when sample_type is Mixture', () => {
      const sample = new Sample();
      sample.sample_type = 'Mixture';
      sample.amount_value = 50;
      sample.buildCopy = () => new Sample(); // Ensure buildCopy returns a Sample instance

      const collectionId = 123;
      const newSample = Sample.copyFromSampleAndCollectionId(sample, collectionId);

      expect(newSample.amount_value).toEqual(50);
    });

    it('should NOT copy amount_value when sample_type is not Mixture', () => {
      const sample = new Sample();
      sample.sample_type = 'Solid';
      sample.amount_value = 50;
      sample.buildCopy = () => new Sample(); // Ensure buildCopy returns a Sample instance

      const collectionId = 123;
      const newSample = Sample.copyFromSampleAndCollectionId(sample, collectionId);

      expect(newSample.amount_value).toBeUndefined();
    });
  });

  describe('Sample.isMixtureLiquid()', () => {
    it('returns false when not a mixture', () => {
      const s = new Sample();
      s.sample_type = 'Solid';
      expect(s.isMixtureLiquid()).toBe(false);
    });

    it('returns true when solvents are present', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.solvent = [{ id: 1 }];
      expect(s.isMixtureLiquid()).toBe(true);
    });

    it('returns true when total volume is present', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.amount_unit = 'l';
      s.amount_value = 1;
      expect(s.isMixtureLiquid()).toBe(true);
    });

    it('returns true when any component is liquid', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.components = [{ material_group: 'solid' }, { material_group: 'liquid' }];
      expect(s.isMixtureLiquid()).toBe(true);
    });
  });

  describe('Sample.preferred_label', () => {
    it('uses external label when present', () => {
      const s = new Sample();
      s.external_label = 'EXT-123';
      s.molecule = { iupac_name: 'IUPAC' };
      expect(s.preferred_label).toBe('EXT-123');
    });

    it('falls back to molecule iupac_name when no external label', () => {
      const s = new Sample();
      s.molecule = { iupac_name: 'IUPAC' };
      expect(s.preferred_label).toBe('IUPAC');
    });
  });

  describe('Sample.calculateMixtureVolume()', () => {
    it('returns 0 for non-mixture or invalid input', () => {
      const s = new Sample();
      s.sample_type = 'Solid';
      expect(s.calculateMixtureVolume(100)).toBe(0);
    });

    it('uses density to compute volume when available', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.density = 1.0; // g/ml
      const volume = s.calculateMixtureVolume(100); // g
      expect(volume).toBeCloseTo(0.1, 6); // 100 g / (1 g/ml) / 1000 = 0.1 L
    });

    it('uses molarity and molecular weight when density is not available', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.density = 0; // not used
      s.molarity_value = 2; // mol/L
      const volume = s.calculateMixtureVolume(10, 0.5, 100); // (10*0.5)/(2*100) = 0.025 L
      expect(volume).toBeCloseTo(0.025, 6);
    });

    it('returns 0 when neither density nor valid molarity/mw are provided', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.density = 0;
      s.molarity_value = 0;
      const volume = s.calculateMixtureVolume(10, 1.0, null);
      expect(volume).toBe(0);
    });
  });

  describe('Sample.calculateMixtureAmountMol()', () => {
    it('returns 0 when no reference component', () => {
      const s = new Sample();
      expect(s.calculateMixtureAmountMol()).toBe(0);
    });

    it('returns reference amount_mol when reference changed flag is set', () => {
      const s = new Sample();
      const refComp = new Component({});
      refComp.amount_mol = 3;
      refComp.reference = true;
      refComp.component_properties = {};
      s.initialComponents([refComp]);
      s.sample_details = { reference_component_changed: true };
      expect(s.calculateMixtureAmountMol()).toBe(3);
    });

    it('calculates amount_mol as total mass / relative MW when available', () => {
      const s = new Sample();
      const refComp = new Component({});
      refComp.reference = true;
      refComp.amount_mol = 1;
      refComp.component_properties = { relative_molecular_weight: 18 };
      // Provide convenience getter compatibility
      refComp.relative_molecular_weight = 18;
      s.initialComponents([refComp]);
      s.sample_type = 'Mixture';
      s.amount_unit = 'g';
      s.amount_value = 36;
      s.sample_details = { reference_component_changed: false };
      expect(s.calculateMixtureAmountMol()).toBeCloseTo(2, 6);
    });

    it('falls back to reference amount_mol or "n.d" when data missing', () => {
      const s1 = new Sample();
      const ref1 = new Component({});
      ref1.reference = true;
      ref1.amount_mol = 1.5;
      ref1.component_properties = { relative_molecular_weight: 0 };
      ref1.relative_molecular_weight = 0;
      s1.initialComponents([ref1]);
      expect(s1.calculateMixtureAmountMol()).toBe(1.5);

      const s2 = new Sample();
      const ref2 = new Component({});
      ref2.reference = true;
      ref2.component_properties = {};
      s2.initialComponents([ref2]);
      expect(s2.calculateMixtureAmountMol()).toBe('n.d');
    });
  });

  describe('Sample.getReferenceRelativeMolecularWeight()', () => {
    it('returns the relative molecular weight from reference component', () => {
      const s = new Sample();
      const ref = { relative_molecular_weight: 42 };
      expect(s.getReferenceRelativeMolecularWeight(ref)).toBe(42);
    });
  });

  describe('Sample.calculateRequiredTotalVolume()', () => {
    let sample;
    let referenceComponent;

    beforeEach(() => {
      sample = new Sample();
      referenceComponent = {
        purity: 1.0,
        starting_molarity_value: 0,
        amount_l: 0.1,
        amount_mol: 0.05,
        concn: 0.5,
        density: 1.0,
        molecule_molecular_weight: 18.015,
        material_group: 'liquid',
        reference: true
      };
      // Set up components array with a reference component
      sample.components = [referenceComponent];
    });

    context('when no reference component exists', () => {
      it('returns 0', () => {
        sample.components = [];
        const result = sample.calculateRequiredTotalVolume();
        expect(result).toBe(0);
      });
    });

    context('when concentration is 0 or negative', () => {
      it('returns 0 when concentration is 0', () => {
        referenceComponent.concn = 0;
        const result = sample.calculateRequiredTotalVolume();
        expect(result).toBe(0);
      });

      it('returns 0 when concentration is negative', () => {
        referenceComponent.concn = -0.5;
        const result = sample.calculateRequiredTotalVolume();
        expect(result).toBe(0);
      });
    });

    context('when material_group is liquid', () => {
      context('when starting_molarity_value is given and > 0', () => {
        it('calculates required volume using stock concentration formula', () => {
          referenceComponent.starting_molarity_value = 2.0;
          referenceComponent.amount_l = 0.1;
          referenceComponent.purity = 0.95;
          referenceComponent.concn = 0.5;

          const result = sample.calculateRequiredTotalVolume();
          const expected = (2.0 * 0.1 * 0.95) / 0.5; // 0.38
          expect(result).toBeCloseTo(expected, 5);
        });

        it('handles zero amount_l', () => {
          referenceComponent.starting_molarity_value = 2.0;
          referenceComponent.amount_l = 0;
          referenceComponent.purity = 0.95;
          referenceComponent.concn = 0.5;

          const result = sample.calculateRequiredTotalVolume();
          expect(result).toBe(0);
        });

        it('handles null amount_l', () => {
          referenceComponent.starting_molarity_value = 2.0;
          referenceComponent.amount_l = null;
          referenceComponent.purity = 0.95;
          referenceComponent.concn = 0.5;

          const result = sample.calculateRequiredTotalVolume();
          expect(result).toBe(0);
        });
      });

      context('when starting_molarity_value is 0 or not given, but density is given', () => {
        it('calculates required volume using density formula', () => {
          referenceComponent.starting_molarity_value = 0;
          referenceComponent.density = 1.2;
          referenceComponent.amount_l = 0.1;
          referenceComponent.purity = 0.9;
          referenceComponent.molecule_molecular_weight = 18.015;
          referenceComponent.concn = 0.3;

          const result = sample.calculateRequiredTotalVolume();
          const expected = (1.2 * 0.1 * 0.9) / (18.015 * 0.3);
          expect(result).toBeCloseTo(expected, 5);
        });

        it('handles zero density', () => {
          referenceComponent.starting_molarity_value = 0;
          referenceComponent.density = 0;
          referenceComponent.amount_l = 0.1;
          referenceComponent.purity = 0.9;
          referenceComponent.molecule_molecular_weight = 18.015;
          referenceComponent.concn = 0.3;

          const result = sample.calculateRequiredTotalVolume();
          expect(result).toBe(0);
        });

        it('handles null amount_l with density', () => {
          referenceComponent.starting_molarity_value = 0;
          referenceComponent.density = 1.2;
          referenceComponent.amount_l = null;
          referenceComponent.purity = 0.9;
          referenceComponent.molecule_molecular_weight = 18.015;
          referenceComponent.concn = 0.3;

          const result = sample.calculateRequiredTotalVolume();
          expect(result).toBe(0);
        });
      });

      context('when neither starting_molarity_value nor density is available', () => {
        it('returns 0', () => {
          referenceComponent.starting_molarity_value = 0;
          referenceComponent.density = 0;
          referenceComponent.amount_l = 0.1;
          referenceComponent.purity = 0.9;
          referenceComponent.concn = 0.3;

          const result = sample.calculateRequiredTotalVolume();
          expect(result).toBe(0);
        });
      });
    });

    context('when material_group is solid', () => {
      it('calculates required volume using amount_mol and concentration', () => {
        referenceComponent.material_group = 'solid';
        referenceComponent.amount_mol = 0.05;
        referenceComponent.concn = 0.2;

        const result = sample.calculateRequiredTotalVolume();
        const expected = 0.05 / 0.2; // 0.25
        expect(result).toBeCloseTo(expected, 5);
      });

      it('handles zero amount_mol', () => {
        referenceComponent.material_group = 'solid';
        referenceComponent.amount_mol = 0;
        referenceComponent.concn = 0.2;

        const result = sample.calculateRequiredTotalVolume();
        expect(result).toBe(0);
      });

      it('handles null amount_mol', () => {
        referenceComponent.material_group = 'solid';
        referenceComponent.amount_mol = null;
        referenceComponent.concn = 0.2;

        const result = sample.calculateRequiredTotalVolume();
        expect(result).toBe(0);
      });
    });

    context('when material_group is neither liquid nor solid', () => {
      it('returns 0', () => {
        referenceComponent.material_group = 'gas';
        referenceComponent.amount_mol = 0.05;
        referenceComponent.concn = 0.2;

        const result = sample.calculateRequiredTotalVolume();
        expect(result).toBe(0);
      });
    });

    context('when purity is not 1.0', () => {
      it('applies purity correction for liquid with stock concentration', () => {
        referenceComponent.starting_molarity_value = 2.0;
        referenceComponent.amount_l = 0.1;
        referenceComponent.purity = 0.8;
        referenceComponent.concn = 0.5;

        const result = sample.calculateRequiredTotalVolume();
        const expected = (2.0 * 0.1 * 0.8) / 0.5; // 0.32
        expect(result).toBeCloseTo(expected, 5);
      });

      it('applies purity correction for liquid with density', () => {
        referenceComponent.starting_molarity_value = 0;
        referenceComponent.density = 1.0;
        referenceComponent.amount_l = 0.1;
        referenceComponent.purity = 0.7;
        referenceComponent.molecule_molecular_weight = 18.015;
        referenceComponent.concn = 0.3;

        const result = sample.calculateRequiredTotalVolume();
        const expected = (1.0 * 0.1 * 0.7) / (18.015 * 0.3);
        expect(result).toBeCloseTo(expected, 5);
      });
    });

    context('edge cases', () => {
      it('handles very small concentration values', () => {
        referenceComponent.material_group = 'solid';
        referenceComponent.amount_mol = 0.001;
        referenceComponent.concn = 0.0001;

        const result = sample.calculateRequiredTotalVolume();
        const expected = 0.001 / 0.0001; // 10
        expect(result).toBeCloseTo(expected, 5);
      });

      it('handles very large concentration values', () => {
        referenceComponent.material_group = 'solid';
        referenceComponent.amount_mol = 10;
        referenceComponent.concn = 100;

        const result = sample.calculateRequiredTotalVolume();
        const expected = 10 / 100; // 0.1
        expect(result).toBeCloseTo(expected, 5);
      });
    });
  });

  describe('Sample.isMixture()', () => {
    it('should return true when sample_type is Mixture', () => {
      const sample = new Sample();
      sample.sample_type = 'Mixture';
      expect(sample.isMixture()).toBe(true);
    });

    it('should return false when sample_type is not Mixture', () => {
      const sample = new Sample();
      sample.sample_type = 'Micromolecule';
      expect(sample.isMixture()).toBe(false);
    });
  });

  describe('Sample.isMixtureLiquid()', () => {
    it('should return false when sample is not a mixture', () => {
      const sample = new Sample();
      sample.sample_type = 'Micromolecule';
      expect(sample.isMixtureLiquid()).toBe(false);
    });

    it('should return true when sample is mixture and has liquid components', () => {
      const sample = new Sample();
      sample.sample_type = 'Mixture';
      sample.components = [
        { material_group: 'liquid' },
        { material_group: 'solid' }
      ];
      expect(sample.isMixtureLiquid()).toBe(true);
    });

    it('should return false when sample is mixture but has no liquid components', () => {
      const sample = new Sample();
      sample.sample_type = 'Mixture';
      sample.components = [
        { material_group: 'solid' },
        { material_group: 'gas' }
      ];
      expect(sample.isMixtureLiquid()).toBe(false);
    });

    it('should return false when sample is mixture but has no components', () => {
      const sample = new Sample();
      sample.sample_type = 'Mixture';
      sample.components = [];
      expect(sample.isMixtureLiquid()).toBe(false);
    });
  });

  describe('Sample.hasComponents()', () => {
    it('should return true when components array has items', () => {
      const sample = new Sample();
      sample.components = [{ id: 1 }, { id: 2 }];
      expect(sample.hasComponents()).toBe(true);
    });

    it('should return false when components array is empty', () => {
      const sample = new Sample();
      sample.components = [];
      expect(sample.hasComponents()).toBe(false);
    });

    it('should be falsy when components is null', () => {
      const sample = new Sample();
      sample.components = null;
      expect(!!sample.hasComponents()).toBe(false);
    });

    it('should be falsy when components is undefined', () => {
      const sample = new Sample();
      sample.components = undefined;
      expect(!!sample.hasComponents()).toBe(false);
    });
  });

  describe('Sample.isNoStructureSample()', () => {
    it('should return true when molecule has DUMMY inchikey and molfile is null', () => {
      const sample = new Sample();
      sample.molecule = { inchikey: 'DUMMY' };
      sample.molfile = null;
      expect(sample.isNoStructureSample()).toBe(true);
    });

    it('should return false when molecule has real inchikey', () => {
      const sample = new Sample();
      sample.molecule = { inchikey: 'BQJCRHHNABKAKU-KBQPJGBKSA-N' };
      sample.molfile = null;
      expect(sample.isNoStructureSample()).toBe(false);
    });

    it('should return false when molfile is not null', () => {
      const sample = new Sample();
      sample.molecule = { inchikey: 'DUMMY' };
      sample.molfile = 'some molfile content';
      expect(sample.isNoStructureSample()).toBe(false);
    });

    it('should return false when molecule is null', () => {
      const sample = new Sample();
      sample.molecule = null;
      sample.molfile = null;
      expect(sample.isNoStructureSample()).toBe(false);
    });
  });

  describe('Sample.getMoleculeId()', () => {
    it('should return M{id} when decoupled and has molfile', () => {
      const sample = new Sample();
      sample.id = 123;
      sample.decoupled = true;
      sample.molfile = 'some molfile content';
      expect(sample.getMoleculeId()).toBe('M123');
    });

    it('should include molecule id and any-any when not decoupled and no stereo', () => {
      const sample = new Sample();
      sample.id = 123;
      sample.decoupled = false;
      sample.molecule = { id: 77 };
      sample.stereo = null;
      expect(sample.getMoleculeId()).toBe('M77_any_any');
    });

    it('should include molecule id and any-any when decoupled without molfile (fallback path)', () => {
      const sample = new Sample();
      sample.id = 123;
      sample.decoupled = true;
      sample.molfile = null;
      sample.molecule = { id: 55 };
      sample.stereo = null;
      expect(sample.getMoleculeId()).toBe('M55_any_any');
    });
  });

  describe('Sample.getChildrenCount()', () => {
    it('should return children_count from static object when available', () => {
      const sample = new Sample();
      sample.id = 123;
      Sample.children_count[123] = 5;
      expect(sample.getChildrenCount()).toBe(5);
    });

    it('should return instance children_count when static not available', () => {
      const sample = new Sample();
      sample.id = 123;
      delete Sample.children_count[123];
      sample.children_count = 3;
      expect(sample.getChildrenCount()).toBe(3);
    });

    it('should be NaN when neither static nor instance count available', () => {
      const sample = new Sample();
      sample.id = 123;
      delete Sample.children_count[123];
      expect(Number.isNaN(sample.getChildrenCount())).toBe(true);
    });
  });

  describe('Sample.buildSplitShortLabel()', () => {
    it('should build split short label with incremented children count', () => {
      const sample = new Sample();
      sample.short_label = 'A';
      sample.getChildrenCount = () => 2;

      const result = sample.buildSplitShortLabel();
      expect(result).toBe('A-3');
    });

    it('should handle short_label with existing split notation', () => {
      const sample = new Sample();
      sample.short_label = 'A-2';
      sample.getChildrenCount = () => 1;

      const result = sample.buildSplitShortLabel();
      expect(result).toBe('A-2-2');
    });
  });

  describe('Sample.buildCopy()', () => {
    it('should create a copy of the sample', () => {
      const sample = new Sample();
      sample.name = 'Test Sample';
      sample.purity = 0.95;
      sample.molecule = { id: 1, iupac_name: 'Test Molecule' };

      const copy = sample.buildCopy();

      expect(copy).toBeInstanceOf(Sample);
      expect(copy.name).toBe('Test Sample');
      expect(copy.purity).toBe(0.95);
      expect(copy.molecule).toEqual(sample.molecule);
    });

    it('should handle sample with stereo information', () => {
      const sample = new Sample();
      sample.stereo = { abs: 'R', rel: 'S' };

      const copy = sample.buildCopy();

      expect(copy.stereo).toEqual({ abs: 'R', rel: 'S' });
    });
  });

  describe('Sample.buildChild()', () => {
    it('should increment counter and create child sample', () => {
      const originalCounter = Sample.counter;
      const sample = new Sample();
      sample.name = 'Parent Sample';

      const child = sample.buildChild();

      expect(Sample.counter).toBe(originalCounter + 1);
      expect(child).toBeInstanceOf(Sample);
    });
  });

  describe('Sample.buildChildWithoutCounter()', () => {
    it('should create child sample without incrementing counter', () => {
      const originalCounter = Sample.counter;
      const sample = new Sample();
      sample.name = 'Parent Sample';
      sample.external_label = 'EXT-001';

      const child = sample.buildChildWithoutCounter();

      expect(Sample.counter).toBe(originalCounter);
      expect(child).toBeInstanceOf(Sample);
      expect(child.name).toBe('Parent Sample');
      expect(child.external_label).toBe('EXT-001');
    });
  });

  describe('Sample.serialize()', () => {
    it('should serialize sample with all properties', () => {
      const sample = new Sample();
      sample.name = 'Test Sample';
      sample.external_label = 'EXT-001';
      sample.target_amount_value = 100;
      sample.target_amount_unit = 'mg';
      sample.purity = 0.95;
      sample.short_label = 'A';
      sample.solvent = 'Water';
      sample.location = 'Fridge A1';
      sample.molfile = 'molfile content';
      sample.molecule = { id: 1, iupac_name: 'Test Molecule' };
      sample.sample_svg_file = 'test.svg';
      sample.is_top_secret = true;
      sample.dry_solvent = 'DMSO';
      sample.parent_id = 123;
      sample.density = 1.2;
      sample.boiling_point_upperbound = 100;
      sample.boiling_point_lowerbound = 80;
      sample.melting_point_upperbound = 50;
      sample.melting_point_lowerbound = 40;
      sample.residues = [{ type: 'test' }];
      sample.elemental_compositions = [{ formula: 'C6H12O6' }];
      sample.is_split = true;
      sample.is_new = true;
      sample.imported_readout = 'test readout';
      sample.container = { id: 1 };
      sample.xref = { id: 1 };
      sample.stereo = { abs: 'R' };
      sample.user_labels = ['label1', 'label2'];
      sample.decoupled = true;
      sample.molecular_mass = 180.16;
      sample.sum_formula = 'C6H12O6';
      sample.inventory_sample = true;
      sample.segments = [{ id: 1 }];
      sample.sample_type = 'Micromolecule';
      sample.sample_details = { test: 'detail' };

      const serialized = sample.serialize();

      expect(serialized.name).toBe('Test Sample');
      expect(serialized.external_label).toBe('EXT-001');
      expect(serialized.target_amount_value).toBe(100);
      expect(serialized.target_amount_unit).toBe('mg');
      expect(serialized.purity).toBe(0.95);
      expect(serialized.short_label).toBe('A');
      expect(serialized.solvent).toBe('Water');
      expect(serialized.location).toBe('Fridge A1');
      expect(serialized.molfile).toBe('molfile content');
      expect(serialized.molecule_id).toBe(1);
      expect(serialized.sample_svg_file).toBe('test.svg');
      expect(serialized.is_top_secret).toBe(true);
      expect(serialized.dry_solvent).toBe('DMSO');
      expect(serialized.parent_id).toBe(123);
      expect(serialized.density).toBe(1.2);
      expect(serialized.boiling_point_upperbound).toBe(100);
      expect(serialized.boiling_point_lowerbound).toBe(80);
      expect(serialized.melting_point_upperbound).toBe(50);
      expect(serialized.melting_point_lowerbound).toBe(40);
      expect(serialized.residues).toEqual([{ type: 'test' }]);
      expect(serialized.elemental_compositions).toEqual([{ formula: 'C6H12O6' }]);
      expect(serialized.is_split).toBe(true);
      expect(serialized.is_new).toBe(true);
      expect(serialized.imported_readout).toBe('test readout');
      expect(serialized.container).toEqual({ id: 1 });
      expect(serialized.xref).toEqual({ id: 1 });
      expect(serialized.stereo).toEqual({ abs: 'R' });
      expect(serialized.user_labels).toEqual(['label1', 'label2']);
      expect(serialized.decoupled).toBe(true);
      expect(serialized.molecular_mass).toBe(180.16);
      expect(serialized.sum_formula).toBe('C6H12O6');
      expect(serialized.inventory_sample).toBe(true);
      expect(serialized.segments).toHaveLength(1);
      expect(serialized.sample_type).toBe('Micromolecule');
      expect(serialized.sample_details).toEqual({ test: 'detail' });
    });

    it('should handle null molecule_id when molecule id is _none_', () => {
      const sample = new Sample();
      sample.molecule = { id: '_none_' };

      const serialized = sample.serialize();

      expect(serialized.molecule_id).toBeNull();
    });

    it('should handle empty user_labels', () => {
      const sample = new Sample();
      sample.user_labels = null;

      const serialized = sample.serialize();

      expect(serialized.user_labels).toEqual([]);
    });
  });

  describe('Sample.cleanBoilingMelting()', () => {
    it('should set boiling_point and melting_point to null', () => {
      const sample = new Sample();
      sample.boiling_point = 100;
      sample.melting_point = 50;

      sample.cleanBoilingMelting();

      expect(sample.boiling_point).toBeNull();
      expect(sample.melting_point).toBeNull();
    });
  });

  describe('Sample.filterElementalComposition()', () => {
    it('should keep only formula entry (id null) and append found entry', () => {
      const sample = new Sample();
      sample.elemental_compositions = [
        { composition_type: 'formula', id: 1, formula: 'C6H12O6' },
        { composition_type: 'loading', id: 2, loading: 0.5 }
      ];

      sample.filterElementalComposition();

      expect(sample.elemental_compositions.length).toBe(2);
      expect(sample.elemental_compositions[0].composition_type).toBe('formula');
      expect(sample.elemental_compositions[0].id).toBeNull();
      expect(sample.elemental_compositions[1].composition_type).toBe('found');
    });
  });

  // Residue helpers rely on a richer structure and are covered elsewhere; skipping here

  // Skipping low-level residue mutation tests in this suite

  describe('Sample.filterSampleData()', () => {
    it('should reset numeric amount fields to defaults', () => {
      const sample = new Sample();
      sample.target_amount_value = 123;
      sample.real_amount_value = 456;

      sample.filterSampleData();

      expect(sample.target_amount_value).toBe(0);
      expect(sample.real_amount_value).toBe(0);
    });
  });

  describe('Sample.updateRange()', () => {
    it('should update range fields correctly', () => {
      const sample = new Sample();

      sample.updateRange('boiling_point', 80, 100);

      expect(sample.boiling_point_lowerbound).toBe(80);
      expect(sample.boiling_point_upperbound).toBe(100);
      expect(sample.boiling_point_display).toBe('80 – 100');
    });

    it('should handle empty string bounds', () => {
      const sample = new Sample();
      sample.updateRange('melting_point', '', '');
      expect(sample.melting_point_lowerbound).toBe('');
      expect(sample.melting_point_upperbound).toBe('');
      expect(sample.melting_point_display).toBe('');
    });

    it('should handle equal bounds as single value', () => {
      const sample = new Sample();
      sample.updateRange('boiling_point', 100, 100);
      expect(sample.boiling_point_lowerbound).toBe(100);
      expect(sample.boiling_point_upperbound).toBe('');
      expect(sample.boiling_point_display).toBe('100');
    });
  });

  describe('Sample.applyMixturePropertiesToSample()', () => {
    it('should apply mixture properties to target sample', () => {
      const sourceSample = new Sample();
      sourceSample.sample_type = 'Mixture';
      sourceSample.sample_details = { total_mixture_mass_g: 50 };

      const targetSample = new Sample();
      const calls = [];
      targetSample.setAmount = (arg) => calls.push(arg);

      sourceSample.applyMixturePropertiesToSample(targetSample);

      expect(calls.length).toBe(1);
      expect(calls[0]).toEqual({ value: 50, unit: 'g' });
    });

    it('should not apply properties when not a mixture', () => {
      const sourceSample = new Sample();
      sourceSample.sample_type = 'Micromolecule';
      sourceSample.sample_details = { total_mixture_mass_g: 50 };

      const targetSample = new Sample();
      const calls = [];
      targetSample.setAmount = (arg) => calls.push(arg);

      sourceSample.applyMixturePropertiesToSample(targetSample);

      expect(calls.length).toBe(0);
    });

    it('should not apply properties when sample_details is undefined', () => {
      const sourceSample = new Sample();
      sourceSample.sample_type = 'Mixture';
      sourceSample.sample_details = undefined;

      const targetSample = new Sample();
      const calls = [];
      targetSample.setAmount = (arg) => calls.push(arg);

      sourceSample.applyMixturePropertiesToSample(targetSample);

      expect(calls.length).toBe(0);
    });
  });

  describe('Sample static methods', () => {
    describe('Sample.copyFromSampleAndCollectionId()', () => {
      it('should handle sample with buildCopy method', () => {
        const originalSample = new Sample();
        originalSample.sample_type = 'Mixture';
        originalSample.amount_value = 100;
        originalSample.buildCopy = () => {
          const copy = new Sample();
          copy.sample_type = 'Mixture';
          copy.amount_value = 100;
          return copy;
        };

        const result = Sample.copyFromSampleAndCollectionId(originalSample, 123);

        expect(result).toBeInstanceOf(Sample);
        expect(result.amount_value).toBe(100);
      });
    });
  });

  describe('Sample getters and setters', () => {
    describe('is_top_secret getter', () => {
      it('should return _is_top_secret value', () => {
        const sample = new Sample();
        sample._is_top_secret = true;
        expect(sample.is_top_secret).toBe(true);
      });
    });

    describe('isSplit setter', () => {
      it('should set is_split property', () => {
        const sample = new Sample();
        sample.isSplit = true;
        expect(sample.is_split).toBe(true);
      });
    });
  });

  describe('Sample edge cases and error handling', () => {
    // Constructor does not support null args, ensure undefined/empty does not throw

    it('should handle constructor with undefined args', () => {
      expect(() => new Sample(undefined)).not.toThrow();
    });

    it('should handle empty constructor', () => {
      expect(() => new Sample()).not.toThrow();
    });

    it('should handle serialize with null molecule', () => {
      const sample = new Sample();
      sample.molecule = null;

      const serialized = sample.serialize();

      expect(serialized.molecule).toBeNull();
      expect(serialized.molecule_id).toBeNull();
    });

    it('should handle serialize with null molecule_name', () => {
      const sample = new Sample();
      sample.molecule_name = null;

      const serialized = sample.serialize();

      expect(serialized.molecule_name_id).toBeNull();
    });
  });

  describe('Sample.calculateTotalMixtureMass()', () => {
    it('sums solids and liquids, and includes solvents when total volume is NOT present', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      // Components: one solid (amount_g), one liquid (density, amount_l)
      s.components = [
        { material_group: 'solid', amount_g: 12.5 },
        { material_group: 'liquid', density: 0.8, amount_l: 0.01 } // 0.8 g/mL * 10 mL = 8 g
      ];
      // Solvents contribute by amount_l and optional density
      s.solvent = [
        { amount_l: 0.002, density: 1.2 }, // 1.2 g/mL * 2 mL = 2.4 g
        { amount_l: 0.001 } // default density 1.0 g/mL -> 1 g
      ];

      s.calculateTotalMixtureMass();

      const expected = 12.5 + 8 + 2.4 + 1; // 23.9 g
      expect(s.sample_details.total_mixture_mass_g).toBeCloseTo(expected, 6);
    });

    it('when total volume IS present, skips solvents and adds remaining volume mass after subtracting liquid components', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.components = [
        { material_group: 'solid', amount_g: 12.5 },
        { material_group: 'liquid', density: 0.8, amount_l: 0.01 } // 0.8 g/mL * 10 mL = 8 g
      ];
      s.solvent = [
        { amount_l: 0.002, density: 1.2 }, // would be 2.4 g if counted
        { amount_l: 0.001 } // would be 1 g if counted
      ];
      // Provide total volume = 10 mL
      // Calculation: solid (12.5) + liquid component (8) + remaining volume (10 - 8 = 2) = 22.5 g
      s.sample_details = { total_mixture_volume_l: 0.01 };

      s.calculateTotalMixtureMass();

      // Expected: 12.5 (solid) + 8 (liquid component) + (10 - 8) (remaining volume mass) = 22.5 g
      // The code subtracts liquid component mass from total volume mass, then adds the remainder
      const expected = 12.5 + 8 + (10 - 8); // = 22.5 g (solvents ignored)
      expect(s.sample_details.total_mixture_mass_g).toBeCloseTo(expected, 6);
    });

    it('does not error when not a mixture or has no components', () => {
      const s1 = new Sample();
      s1.sample_type = 'Micromolecule';
      s1.components = [];
      expect(() => s1.calculateTotalMixtureMass()).not.toThrow();

      const s2 = new Sample();
      s2.sample_type = 'Mixture';
      s2.components = [];
      expect(() => s2.calculateTotalMixtureMass()).not.toThrow();
    });

    it('updates density when total volume is provided afterwards', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.components = [
        { material_group: 'liquid', density: 1.0, amount_l: 0.005, handleTotalVolumeChanges: () => {} } // 1.0 g/mL * 5 mL = 5 g
      ];

      s.calculateTotalMixtureMass(); // sets total_mixture_mass_g = 5 (no total volume yet)
      s.setTotalMixtureVolume(0.01); // 10 mL; recalculates: 5 g (component) + (10 - 5) g (remaining volume) = 10 g

      // density = total_mass_g / total_volume_mL = 10 g / 10 mL = 1.0 g/mL
      expect(s.density).toBeCloseTo(1.0, 6);
    });
  });

  describe('Sample.total_mixture_mass_g getter', () => {
    it('returns the total mixture mass when set and valid', () => {
      const s = new Sample();
      s.sample_details = { total_mixture_mass_g: 0.45 };
      expect(s.total_mixture_mass_g).toBe(0.45);
    });

    it('returns null when total_mixture_mass_g is not set', () => {
      const s = new Sample();
      s.sample_details = {};
      expect(s.total_mixture_mass_g).toBeNull();
    });

    it('returns null when total_mixture_mass_g is null', () => {
      const s = new Sample();
      s.sample_details = { total_mixture_mass_g: null };
      expect(s.total_mixture_mass_g).toBeNull();
    });

    it('returns null when total_mixture_mass_g is not a finite number', () => {
      const s = new Sample();
      s.sample_details = { total_mixture_mass_g: Infinity };
      expect(s.total_mixture_mass_g).toBeNull();
      
      s.sample_details = { total_mixture_mass_g: NaN };
      expect(s.total_mixture_mass_g).toBeNull();
    });

    it('returns null when sample_details is undefined', () => {
      const s = new Sample();
      s.sample_details = undefined;
      expect(s.total_mixture_mass_g).toBeNull();
    });
  });

  describe('Sample.updateMixtureDensity()', () => {
    it('sets density = total_mass_g / total_volume_mL for liquid mixtures with volume', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.components = [{ material_group: 'liquid' }];
      s.sample_details = { total_mixture_mass_g: 7.5, total_mixture_volume_l: 0.015 }; // 15 mL

      s.updateMixtureDensity();

      // 7.5 g / 15 mL = 0.5 g/mL
      expect(s.density).toBeCloseTo(0.5, 6);
    });

    it('resets density to 0 when volume is missing', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.components = [{ material_group: 'liquid' }];
      s.sample_details = { total_mixture_mass_g: 7.5, total_mixture_volume_l: 0 };

      s.updateMixtureDensity();
      expect(s.density).toBe(0);
    });
  });

  describe('Sample.updateConcentrationFromSolvent()', () => {
    let sample;
    let reaction;

    beforeEach(() => {
      // Create sample with amount_mol by setting amount_value and amount_unit to 'mol'
      // amount_mol getter returns amount_value when amount_unit === 'mol' for mixtures
      sample = new Sample({
        amount_value: 0.1,
        amount_unit: 'mol',
        sample_type: 'Mixture'
      });
      reaction = {
        volume: 0.5,
        use_reaction_volume: false,
        calculateCombinedReactionVolume: () => 0.2,
        solventVolume: 0.1
      };
    });

    it('uses reaction volume when checkbox is checked', () => {
      reaction.use_reaction_volume = true;
      reaction.volume = 0.5;

      sample.updateConcentrationFromSolvent(reaction);

      expect(sample.concn).toBeCloseTo(0.2, 5); // 0.1 mol / 0.5 L = 0.2 mol/L
    });

    it('uses combined volume when checkbox is unchecked', () => {
      reaction.use_reaction_volume = false;
      reaction.calculateCombinedReactionVolume = () => 0.2;

      sample.updateConcentrationFromSolvent(reaction);

      expect(sample.concn).toBeCloseTo(0.5, 5); // 0.1 mol / 0.2 L = 0.5 mol/L
    });

    it('sets concn to null when volume is null and combined volume is also null', () => {
      reaction.use_reaction_volume = true;
      reaction.volume = null;
      // When reaction.volume is null, it falls back to calculateCombinedReactionVolume
      reaction.calculateCombinedReactionVolume = () => null;

      sample.updateConcentrationFromSolvent(reaction);

      expect(sample.concn).toBe(null);
    });

    it('sets concn to null when volume is 0 and combined volume is also null', () => {
      reaction.use_reaction_volume = true;
      reaction.volume = 0;
      // When reaction.volume is 0, it falls back to calculateCombinedReactionVolume
      reaction.calculateCombinedReactionVolume = () => null;

      sample.updateConcentrationFromSolvent(reaction);

      expect(sample.concn).toBe(null);
    });

    it('sets concn to null when combined volume is null', () => {
      reaction.use_reaction_volume = false;
      reaction.calculateCombinedReactionVolume = () => null;

      sample.updateConcentrationFromSolvent(reaction);

      expect(sample.concn).toBe(null);
    });

    it('works for both mixtures and non-mixtures', () => {
      // Test for mixture - amount_mol getter returns amount_value when amount_unit === 'mol' for mixtures
      const mixtureSample = new Sample({
        amount_value: 0.1,
        amount_unit: 'mol',
        sample_type: 'Mixture',
      });
      reaction.use_reaction_volume = true;
      reaction.volume = 0.5;

      mixtureSample.updateConcentrationFromSolvent(reaction);
      expect(mixtureSample.concn).toBeCloseTo(0.2, 5);

      // Test for non-mixture - for non-mixtures, amount_mol is calculated differently
      // We'll use a sample with amount_value in grams and molecular weight to get amount_mol
      const nonMixtureSample = new Sample({
        amount_value: 18.015, // 1 mol of water in grams
        amount_unit: 'g',
        sample_type: 'Micromolecule',
        molecule: { molecular_weight: 18.015 }
      });
      reaction.use_reaction_volume = true;
      reaction.volume = 0.5;

      nonMixtureSample.updateConcentrationFromSolvent(reaction);
      // 18.015 g / 18.015 g/mol = 1 mol, so concn = 1 mol / 0.5 L = 2 mol/L
      expect(nonMixtureSample.concn).toBeCloseTo(2.0, 5);
    });

    it('sets concn to null when amount_mol is invalid', () => {
      // Create sample with invalid amount_mol by not setting amount_value
      const sampleWithNullMol = new Sample({
        amount_value: null,
        amount_unit: 'mol',
        sample_type: 'Mixture',
      });
      reaction.use_reaction_volume = true;
      reaction.volume = 0.5;

      sampleWithNullMol.updateConcentrationFromSolvent(reaction);

      expect(sampleWithNullMol.concn).toBe(null);
    });

    it('sets concn to null when reaction is null', () => {
      sample.updateConcentrationFromSolvent(null);

      expect(sample.concn).toBe(null);
    });
  });
});
