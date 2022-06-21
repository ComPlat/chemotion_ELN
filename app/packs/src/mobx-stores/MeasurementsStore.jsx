import { keys, values } from 'mobx';
import { types } from 'mobx-state-tree';

import MeasurementsFetcher from '../components/fetchers/MeasurementsFetcher';

const SampleHeaderForMeasurement = types.model({
  id: types.identifierNumber,
  name: types.string,
  short_label: types.string,
});

const Measurement = types.model({
  id: types.identifierNumber,
  description: types.string,
  value: types.number,
  unit: types.string,
  source_type: types.string,
  source_id: types.integer,
  header: types.reference(SampleHeaderForMeasurement)
});


export const MeasurementsStore = types
  .model({
    sampleHeaders: types.map(SampleHeaderForMeasurement),
    measurements: types.map(Measurement)
  })
  .actions(self => ({
    addMeasurementsForSample(rawData) {
      let sampleHeader = SampleHeaderForMeasurement.create({ id: rawData.id, name: rawData.name, short_label: rawData.short_label });
      let measurements = rawData.measurements.map(measurement => Measurement.create({ ...measurement, header: sampleHeader.id }));

      self.sampleHeaders.set(sampleHeader.id, sampleHeader);
      measurements.forEach(measurement => self.measurements.set(measurement.id, measurement));
    },
    loadDataForSample(sample_id, afterComplete = () => {}) {
      // this is a very simple implementation
      // for more complex cases we should use the generator version.
      // see https://mobx-state-tree.js.org/concepts/async-actions for more details.
      MeasurementsFetcher.fetchMeasurementHierarchy(sample_id)
        .then(result => result.forEach(entry => self.addMeasurementsForSample(entry)))
        .then(afterComplete())
    }
  }))
  .views(self => ({
    dataForSampleAvailable(sample) {
      let sample_ids = [...sample.ancestor_ids, sample.id].filter(a => a);
      let available_sample_ids = keys(self.sampleHeaders);
      console.debug('sample ids:', sample_ids);
      console.debug('available sample ids: ', available_sample_ids);

      return sample_ids.some(sample_id => available_sample_ids.includes(sample_id));
    },
    sampleHeader(sample_id) {
      return self.sampleHeaders.get(sample_id);
    },
    measurementsForSamples(sample_ids) {
      return values(self.measurements).filter(measurement => sample_ids.includes(measurement.header.id));
    },
    measurementsForSample(sample_id) {
      return values(self.measurements).filter(measurement => measurement.sample_id == sample_id);
    }
  }));
