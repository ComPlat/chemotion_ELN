import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class SampleTaskFetcher {
  static openSampleTasks() {
    return SampleTaskFetcher.#fetchSampleTasks('open');
  }

  static assignSample(sampleId, sampleTaskId) {
    return ApiClient.putJson(`/api/v1/sample_tasks/${sampleTaskId}`, { body: sampleId });
  }

  static createSampleTask(sampleId, requiredScanResults) {
    const body = {
      sample_id: sampleId,
      required_scan_results: requiredScanResults
    };

    return ApiClient.postJson('/api/v1/sample_tasks', { body });
  }

  static deleteSampleTask(sampleTaskId) {
    return ApiClient.deleteRequest(`/api/v1/sample_tasks/${sampleTaskId}`);
  }

  static #fetchSampleTasks(status) {
    return ApiClient.getJson(`/api/v1/sample_tasks?status=${status}`)
      .then((json) => json.sample_tasks);
  }
}
