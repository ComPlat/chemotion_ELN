import expect from 'expect';
import SampleFactory from "factories/SampleFactory";
import Sample from 'src/models/Sample.js';
import Component from 'src/models/Component';

describe('Sample', async () => {
    const referenceSample = await SampleFactory.build("SampleFactory.water_100g")
    const product = await SampleFactory.build("SampleFactory.water_100g")

    describe('Sample.calculateMaxAmount()', () => {
        context('when input is valid', () => {
            it('returns amount of 100', () => {
                product.coefficient = 1;
                referenceSample.coefficient = 1;
                product.calculateMaxAmount(referenceSample);

                expect(product.maxAmount).toBeCloseTo(100, 5);
            });
        })

        context('when product coefficient is two', () => {
            it('returns amount of 200', () => {
                product.coefficient = 2;
                referenceSample.coefficient = 1;
                product.calculateMaxAmount(referenceSample);
                expect(product.maxAmount).toBeCloseTo(200, 5);
            });
        })

        context('when product coefficient is zero', () => {
            it('amount is 100 because zero coefficient was set to one', () => {
                product.coefficient = 0;
                referenceSample.coefficient = 1;
                product.calculateMaxAmount(referenceSample)
                expect(product.maxAmount).toBeCloseTo(100, 5);
            });
        })

        context('when reference coefficient is four', () => {
            it('returns amount of 25', () => {
                product.coefficient = 1;
                referenceSample.coefficient = 4;
                product.calculateMaxAmount(referenceSample);

                expect(product.maxAmount).toBeCloseTo(25, 5);
            });
        })
    });

    describe('Sample.copyFromSampleAndCollectionId()', () => {
        it('should copy amount_value when sample_type is Mixture', () => {
            const sample = new Sample();
            sample.sample_type = 'Mixture';
            sample.amount_value = 50;
            sample.buildCopy = () => new Sample(); // Ensure buildCopy returns a Sample instance

            const collection_id = 123;
            const newSample = Sample.copyFromSampleAndCollectionId(sample, collection_id);

            expect(newSample.amount_value).toEqual(50);
        });

        it('should NOT copy amount_value when sample_type is not Mixture', () => {
            const sample = new Sample();
            sample.sample_type = 'Solid';
            sample.amount_value = 50;
            sample.buildCopy = () => new Sample(); // Ensure buildCopy returns a Sample instance

            const collection_id = 123;
            const newSample = Sample.copyFromSampleAndCollectionId(sample, collection_id);

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
});
