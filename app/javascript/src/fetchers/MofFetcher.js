import ApiClient from 'src/api_clients/ChemotionApiClient';

/**
 * Client for Chemotion's MOF API (CIF → MOFid/MOFkey via sidecar).
 */
export default class MofFetcher {
  // Kept above the Rails→sidecar timeout (MofService: 180s) so the browser
  // receives the clean 422 instead of aborting at the same moment.
  static REQUEST_TIMEOUT = 200000;

  /**
   * Send CIF text to the backend and return MOFid identifiers.
   * @param {string} cif - CIF file contents
   * @returns {Promise<Object>}
   */
  static analyze(cif) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MofFetcher.REQUEST_TIMEOUT);

    const handleResponseSuccess = (response) => {
      if (response.ok) return response.json();
      return response.json().then(
        (errorData) => {
          throw new Error(errorData.error || `API returned status ${response.status}`);
        },
        () => {
          throw new Error(`API returned status ${response.status}`);
        }
      );
    };

    const handleResponseError = (exception) => {
      if (exception.name === 'AbortError') {
        throw new Error('MOF request timed out');
      }
      throw exception;
    };

    return ApiClient.postJson('/api/v1/mof/analyze', {
      body: { cif },
      signal: controller.signal,
      handleResponseSuccess,
      handleResponseError,
    }).finally(() => clearTimeout(timeoutId));
  }
}
