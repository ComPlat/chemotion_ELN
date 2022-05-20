import 'whatwg-fetch';
import Measurement from '../models/Measurement';

export default class MeasurementsFetcher {
  static fetchMeasurementHierarchy(sample) {
    // No measurement fetching for new samples
    if (sample.is_new == true) {
      return new Promise(() => []);
    }

    const promise = fetch(`/api/v1/measurements/?sample_id=${sample.id}`, {
      credentials: 'same-origin',
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(
      response => response.json()
    ).then(
      json => json.measurements
    ).catch(
      errorMessage => { console.log(errorMessage); }
    );

    return promise;
  }

  static createMeasurements(measurementCandidates, researchPlanId) {
    const measurements = measurementCandidates.map(candidate => new Measurement(candidate));

    return fetch('/api/v1/measurements/bulk_create_from_raw_data', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw_data: measurements,
        source_type: 'ResearchPlan',
        source_id: researchPlanId
      })
    }).then(response => response.json())
      .then(json => json.bulk_create_from_raw_data)
      .catch((errorMessage) => { console.log(errorMessage); });
  }

  static deleteMeasurement(measurementId) {
    return fetch(`/api/v1/measurements/${measurementId}`, {
      credentials: 'same-origin',
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    }).then(response => response.json())
      .catch(errorMessage => console.log(errorMessage));
  }
}
