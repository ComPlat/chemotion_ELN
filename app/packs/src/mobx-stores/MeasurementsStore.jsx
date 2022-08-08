import { keys, values } from 'mobx';
import { types } from 'mobx-state-tree';

import MeasurementsFetcher from 'src/fetchers/MeasurementsFetcher';

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
    _storeMeasurementsForSample(rawData) {
      let sampleHeader = SampleHeaderForMeasurement.create({ id: rawData.id, name: rawData.name, short_label: rawData.short_label });
      let measurements =
        rawData
          .measurements
          .map(rawMeasurement => Measurement.create({ ...rawMeasurement, header: sampleHeader.id }));

      self.sampleHeaders.set(sampleHeader.id, sampleHeader);
      measurements.forEach(measurement => self.measurements.set(measurement.id, measurement));
    },
    loadMeasurementsForSample(sampleId, afterComplete = () => {}) {
      // this is a very simple implementation
      // for more complex cases we should use the generator version.
      // see https://mobx-state-tree.js.org/concepts/async-actions for more details.
      MeasurementsFetcher.fetchMeasurementHierarchy(sampleId)
        .then(result => result.forEach(entry => self._storeMeasurementsForSample(entry)))
        .then(result => afterComplete())
    },
    deleteMeasurement(id, afterComplete = () => {}) {
      let measurement = self.measurements.get(id);
      if (!measurement) { return null; }

      MeasurementsFetcher.deleteMeasurement(id).then(result => {
        if (result.success) { self._deleteMeasurementFromStore(id); }
        afterComplete();
      });
    },
    _deleteMeasurementFromStore(id) {
      let measurementToDelete = self.measurements.get(id);
      let isLastMeasurementForSample = values(self.measurements).filter(measurement => measurement.header == measurementToDelete.header).length == 1
      if (isLastMeasurementForSample) {
        self.sampleHeaders.delete(measurementToDelete.header.id);
      }
      self.measurements.delete(id);
    },
    createMeasurements(candidates, researchPlanId, afterComplete = (result) => {}) {
      MeasurementsFetcher.createMeasurements(candidates, researchPlanId)
        .then(result => afterComplete(result))
    }
  }))
  .views(self => ({
    dataForSampleHierarchyAvailable(sample) {
      let sampleIds = [...sample.ancestor_ids, sample.id].filter(a => a);

      return sampleIds.some(sampleId => self.dataForSampleAvailable(sampleId));
    },
    dataForSampleAvailable(sampleId) {
      return keys(self.sampleHeaders).includes(sampleId.toString())
    },
    sampleHeader(sampleId) {
      return self.sampleHeaders.get(sampleId);
    },
    measurementsForSamples(sampleIds) {
      return values(self.measurements).filter(measurement => sampleIds.includes(measurement.header.id));
    },
    measurementsForSample(sampleId) {
      return values(self.measurements).filter(measurement => measurement.header.id == sampleId);
    }
  }));
