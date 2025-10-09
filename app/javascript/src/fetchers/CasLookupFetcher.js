import 'whatwg-fetch';

/**
 * CasLookupFetcher - Handles fetching data via CAS Lookup API
 *
 * Security Note: API calls are proxied through the Rails backend to keep
 * API keys secure. Never call external APIs with secret keys from frontend!
 */
export default class CasLookupFetcher {
  static REQUEST_TIMEOUT = 10000; // 10 seconds

  /**
   * Fetch data by CAS number via backend API
   * Backend handles CAS API with fallback to PubChem
   * @param {string} casNumber - The CAS Registry Number
   * @returns {Promise<Object>} - Object with smiles, cas, and source properties
   * @throws {Error} - When both CAS and PubChem APIs fail
   */
  static fetchByCas(casNumber) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      CasLookupFetcher.REQUEST_TIMEOUT
    );

    return fetch('/api/v1/cas_lookup/lookup', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ cas_number: casNumber }),
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then(
            (errorData) => {
              const errorMsg = errorData.error || `API returned status ${response.status}`;
              throw new Error(errorMsg);
            },
            () => {
              throw new Error(`API returned status ${response.status}`);
            }
          );
        }
        return response.json();
      })
      .then((data) => {
        if (!data.smiles || typeof data.smiles !== 'string') {
          throw new Error('Invalid response format from API');
        }

        return {
          smiles: data.smiles,
          cas: data.cas || casNumber,
          source: data.source || 'unknown',
        };
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          console.error('CAS Lookup API request timeout');
          throw new Error('Request timed out');
        }

        console.error('CAS Lookup API error:', error);
        throw error;
      })
      .finally(() => {
        // Ensure timeout is cleared
        clearTimeout(timeoutId);
      });
  }
}
