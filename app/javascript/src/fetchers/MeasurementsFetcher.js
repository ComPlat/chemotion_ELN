import ApiClient from 'src/api_clients/ChemotionApiClient';
import Measurement from 'src/models/Measurement';

export default class MeasurementsFetcher {
  static fetchMeasurementHierarchy(sampleOrSampleId) {
    // No measurement fetching for new samples
    if (sampleOrSampleId.is_new === true) {
      return Promise.resolve([]);
    }
    const sampleId = sampleOrSampleId.id || sampleOrSampleId;

    return ApiClient.getJson(`/api/v1/measurements/?sample_id=${sampleId}`)
      .then((json) => json.measurements);
  }

  static createMeasurements(measurementCandidates, researchPlanId) {
    const measurements = measurementCandidates.map((candidate) => new Measurement(candidate));

    return ApiClient.postJson('/api/v1/measurements/bulk_create_from_raw_data', {
      body: {
        raw_data: measurements,
        source_type: 'ResearchPlan',
        source_id: researchPlanId
      }
    })
      .then((json) => json.measurements);
  }

  static deleteMeasurement(measurementId) {
    return ApiClient.deleteRequest(`/api/v1/measurements/${measurementId}`);
  }
}
