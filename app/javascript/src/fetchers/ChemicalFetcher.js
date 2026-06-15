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
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        });
      },
    });
  }

  static saveManualAttachedSafetySheet(params) {
    return ApiClient.postJson('/api/v1/chemicals/save_manual_sds', { body: params });
  }

  static safetyPhrases(queryParams) {
    return ApiClient.getJson(`/api/v1/chemicals/safety_phrases/${queryParams.id}?vendor=${queryParams.vendor}`, {
      handleResponseSuccess: (response) => {
        if (response.status === 204) { return response.status; }
        return response.json();
      },
    });
  }

  static chemicalProperties(productLink) {
    return ApiClient.getJson(`/api/v1/chemicals/chemical_properties?link=${productLink}`);
  }
}
