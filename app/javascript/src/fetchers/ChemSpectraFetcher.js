import ApiClient from 'src/api_clients/ChemotionApiClient';

export default class ChemSpectraFetcher {
  static fetchSpectraLayouts() {
    return ApiClient.getJson('/api/v1/chemspectra/spectra_layouts', {
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.json(); }
        return null;
      },
    });
  }

  static updateDataTypes(newDataTypes) {
    const requestData = { datatypes: newDataTypes };
    return ApiClient.putJson('/api/v1/admin/data_types', {
      body: requestData,
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.json(); }
        throw response;
      },
    });
  }

  static fetchUpdatedSpectraLayouts() {
    return ApiClient.getJson('/data_type.json', {
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.json(); }
        return null;
      },
    })
      .then((data) => {
        if (!data) { throw new Error('Failed to fetch JSON'); }
        return Object.entries(data.datatypes);
      });
  }
}
