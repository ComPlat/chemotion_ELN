import ApiClient from 'src/api_clients/ChemotionApiClient';
import Chemical from 'src/models/Chemical';

const SDS_POLL_INTERVAL_MS = 2000;
const SDS_POLL_ATTEMPTS = 60;
export const SDS_STILL_QUEUED = 'the sheet is still waiting to be read in the background; try again in a minute';

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
  // The server answers 202 while SdsExtractionJob reads the sheet, so this polls until the stored
  // result arrives; a busy text service (503 with Retry-After) is asked again after that delay.
  // Polling stops, resolving undefined, once `cancelled` returns true.
  static extractFromSds(sheetPath, {
    interval = SDS_POLL_INTERVAL_MS, attempts = SDS_POLL_ATTEMPTS, cancelled = () => false,
  } = {}) {
    const url = `/api/v1/chemicals/extract_sds?${new URLSearchParams({ path: sheetPath })}`;
    const request = () => ApiClient.getJson(url, {
      handleResponseSuccess: (response) => {
        if (response.status === 202) return { retryIn: interval };
        if (response.ok) return response.json().then((result) => ({ result }));
        const retryAfter = Number(response.headers?.get('Retry-After'));
        return response.json().catch(() => ({})).then((errorData) => {
          const error = new Error(errorData.error || `HTTP ${response.status}`);
          if (response.status === 503 && retryAfter > 0) return { retryIn: retryAfter * 1000, error };
          throw error;
        });
      },
      handleResponseError: (error) => { throw error; },
    });
    const poll = (left) => (cancelled() ? Promise.resolve(undefined) : request().then(({ result, retryIn, error }) => {
      if (retryIn === undefined) return result;
      if (left <= 1) throw error || new Error(SDS_STILL_QUEUED);
      return new Promise((resolve) => { setTimeout(resolve, retryIn); }).then(() => poll(left - 1));
    }));

    return poll(attempts);
  }
}
