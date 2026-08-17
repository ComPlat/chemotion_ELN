import ApiClient from 'src/api_clients/ChemotionApiClient';

/**
 * Client for Chemotion's MOF API (CIF → MOFid/MOFkey via sidecar).
 */
export default class MofFetcher {
  // Kept above the Rails→sidecar timeout (MofService: 180s) so the browser
  // receives the clean 422 instead of aborting at the same moment.
  static REQUEST_TIMEOUT = 200000;

  /**
   * POST to a MOF endpoint with a timeout, surfacing the sidecar's error message.
   * @param {string} endpoint
   * @param {Object} body
   * @returns {Promise<Object>}
   */
  static postWithTimeout(endpoint, body) {
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

    return ApiClient.postJson(endpoint, {
      body,
      signal: controller.signal,
      handleResponseSuccess,
      handleResponseError,
    }).finally(() => clearTimeout(timeoutId));
  }

  /**
   * Send CIF text to the backend and return MOFid identifiers.
   * @param {string} cif - CIF file contents
   * @returns {Promise<Object>}
   */
  static analyze(cif) {
    return MofFetcher.postWithTimeout('/api/v1/mof/analyze', { cif });
  }

  /**
   * Split a drawn structure into MOF nodes and linkers.
   * @param {string} molfile - Molfile of the drawn structure
   * @returns {Promise<{ nodes: string[], linkers: string[] }>}
   */
  static fragment(molfile) {
    return MofFetcher.postWithTimeout('/api/v1/mof/fragment', { molfile });
  }
}
