import ApiClient from 'src/api_clients/ChemotionApiClient';
import Chemical from 'src/models/Chemical';

export default class ChemicalFetcher {
  // Fetch chemical by either sample_id or sequence_based_macromolecule_sample_id, depending on type
  static fetchChemical(id, type) {
    const paramName = type === 'SBMM' ? 'sequence_based_macromolecule_sample_id' : 'sample_id';
    return ApiClient.getJson(`/api/v1/chemicals?${paramName}=${id}`)
      .then((json) => new Chemical(json));
  }

  static create(data) {
    const { ...params } = data;
    return ApiClient.postJson('/api/v1/chemicals/create', { body: params });
  }

  static update(params) {
    const { ...bodyParams } = params;
    return ApiClient.putJson('/api/v1/chemicals', { body: bodyParams });
  }

  static fetchSafetySheets(queryParams) {
    const searchTerm = {
      'data[vendor]': queryParams.vendor,
      'data[option]': queryParams.queryOption,
      'data[language]': queryParams.language,
      'data[searchStr]': queryParams.string
    };
    if (queryParams.productNumber) {
      searchTerm['data[productNumber]'] = queryParams.productNumber;
    }
    const path = `/api/v1/chemicals/fetch_safetysheet/${queryParams.id}?${new URLSearchParams(searchTerm)}`;

    return ApiClient.getJson(path, {
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.text(); }
        return null;
      },
    });
  }

  static saveSafetySheets(params) {
    return ApiClient.postJson('/api/v1/chemicals/save_safety_datasheet', {
      body: params,
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.json(); }
        return response.json().then((errorData) => {
          const error = new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
          // A refusal the other save route would meet as well; trying it only wastes a fetch.
          error.final = !!errorData.final;
          throw error;
        });
      },
      // The client's default handler logs and resolves undefined, which turned every
      // reason the server gave into a bare "could not retrieve" on the way out.
      handleResponseError: (error) => { throw error; },
    });
  }

  // Reads a sheet straight from the vendor, for vendors that refuse the server but allow CORS.
  static fetchVendorSheet(sdsLink, fileName) {
    return fetch(sdsLink)
      .then((response) => {
        if (!response.ok) throw new Error(`the vendor answered ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        if (blob.type && !blob.type.includes('pdf')) throw new Error('the vendor did not return a PDF');
        return new File([blob], fileName, { type: 'application/pdf' });
      });
  }

  static saveManualAttachedSafetySheet(params) {
    return ApiClient.postFormData('/api/v1/chemicals/save_manual_sds', { body: params });
  }

  // Rejects on a failed request so the caller can tell it from a sheet that yielded nothing.
  static extractFromSds(sheetPath) {
    return ApiClient.getJson(`/api/v1/chemicals/extract_sds?${new URLSearchParams({ path: sheetPath })}`, {
      handleResponseSuccess: (response) => {
        if (response.ok) return response.json();
        return response.json().catch(() => ({})).then((errorData) => {
          throw new Error(errorData.error || `HTTP ${response.status}`);
        });
      },
      handleResponseError: (error) => { throw error; },
    });
  }

  // Whether an LLM provider is configured for the current user (personal or
  // institution). Resolves to false on error so AI features fail safe (disabled).
  static llmAvailable() {
    return fetch('/api/v1/llm/available', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((d) => !!d.available)
      .catch(() => false);
  }

  // Queues the AI extraction job; sheetPath picks the saved sheet, else the job takes the last one.
  static extractSds(sampleId, sheetPath) {
    return fetch('/api/v1/chemicals/extract_sds', {
      credentials: 'same-origin',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sample_id: sampleId, ...(sheetPath ? { path: sheetPath } : {}) })
    }).then((response) => {
      if (response.ok) {
        return response.json();
      }
      return response.json().then((errorData) => {
        throw new Error(errorData.error || `HTTP ${response.status}`);
      });
    });
  }
}
