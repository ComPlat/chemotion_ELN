import expect from 'expect';
import SampleFactory from "factories/SampleFactory";
import Sample from 'src/models/Sample.js';

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
});
