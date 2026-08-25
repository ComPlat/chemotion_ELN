import ApiClient from 'src/api_clients/ChemotionApiClient';
import { Map } from 'immutable';

import Sample from 'src/models/Sample';
import { rootStore } from 'src/stores/mobx/RootStore';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import Literature from 'src/models/Literature';
import { preparedCollectionParams } from 'src/utilities/FetcherHelper';

export default class SamplesFetcher {
  static fetchByCollectionId(id, params = {}, moleculeSort = false) {
    const updatedParams = { ...params, moleculeSort: moleculeSort ? 1 : 0 };

    return ApiClient.getJson(`/api/v1/samples?${preparedCollectionParams(id, updatedParams)}`, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.samples.map((sample) => (new Sample(sample))),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
  }

  static fetchSamplesByUIStateAndLimit(params) {
    const body = {
      ui_state: {
        all: params.sample.all,
        included_ids: params.sample.included_ids,
        excluded_ids: params.sample.excluded_ids,
        collection_id: params.sample.collection_id
      },
      limit: params?.limit || null
    };

    return ApiClient.postJson('/api/v1/samples/ui_state', { body })
      .then((json) => {
        const samples = (json.samples || []).map((s) => new Sample(s));
        samples.forEach((sample) => this.sampleLiteratures(sample, json));
        return samples;
      });
  }

  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/samples/${id}`)
      .then((json) => this.sampleElement(json, id));
  }

  static findByShortLabel(shortLabel) {
    return ApiClient.getJson(`/api/v1/samples/findByShortLabel/${shortLabel}.json`);
  }

  static create(sample) {
    return AttachmentFetcher.uploadNewAttachmentsForContainer(sample.container)
      .then(() => ApiClient.postJson('/api/v1/samples', { body: sample.serialize() }))
      .then((json) => {
        const { id } = json.sample;
        return GenericElsFetcher.uploadGenericFiles(sample, id, 'Sample')
          .then(() => this.sampleElement(json, id));
      });
  }

  static update(sample) {
    const tasks = [
      AttachmentFetcher.uploadNewAttachmentsForContainer(sample.container),
      GenericElsFetcher.uploadGenericFiles(sample, sample.id, 'Sample'),
    ];

    return Promise.all(tasks)
      .then(() => AnnotationsFetcher.updateAnnotationsInContainer(sample))
      .then(() => ApiClient.putJson(`/api/v1/samples/${sample.id}`, { body: sample.serialize() }))
      .then((json) => this.sampleElement(json, sample.id));
  }

  static splitAsSubsamples(params) {
    const body = {
      ui_state: {
        sample: {
          all: params.sample.checkedAll,
          included_ids: params.sample.checkedIds,
          excluded_ids: params.sample.uncheckedIds
        },
        currentCollectionId: params.currentCollection.id
      }
    };

    return ApiClient.postJson('/api/v1/samples/subsamples', { body });
  }

  static importSamplesFromFile(params) {
    const data = new FormData();
    if (params.file !== undefined) {
      data.append('file', params.file);
    } else {
      const jsonData = JSON.stringify(params.data);
      data.append('data', jsonData);
    }
    data.append('currentCollectionId', params.currentCollectionId);
    data.append('import_type', params.type);

    return ApiClient.postFormData('/api/v1/samples/import', { body: data })
      .then((json) => {
        rootStore.notificationsStore.notifyImportSamplesFromFile(json);
        return json;
      });
  }

  static batchRefreshSvg(svgs) {
    const body = {
      svgs: svgs.map((svg) => ({
        svg_path: svg.svgPath,
        molfile: svg.molfile
      }))
    };

    return ApiClient.postJson('/api/v1/samples/batch-refresh-svg', {
      body,
      handleResponseSuccess: (response) => {
        if (response.ok) { return response.json(); }
        throw new Error(`HTTP error! status: ${response.status}`);
      },
      handleResponseError: (exception) => {
        console.error('Error batch refreshing SVGs:', exception);
        throw exception;
      }
    })
      .then((json) => json.results || []);
  }

  static sampleElement(json, id) {
    if (json.error) {
      return new Sample({ id: `${id}:error:Sample ${id} is not accessible!` });
    }
    const sample = new Sample(json.sample);
    return this.sampleLiteratures(sample, json);
  }

  static sampleLiteratures(sample, json) {
    // build literature map by literal_id
    const literatures = (json.literatures || []).reduce(
      (acc, l) => acc.set(l.literal_id, new Literature(l)),
      new Map()
    );
    const sampleLits = literatures.filter((l) => l.element_id === sample.id);
    if (sampleLits.size > 0) {
      // eslint-disable-next-line no-param-reassign
      sample.literatures = sampleLits;
      sample.updateChecksum(); // prevent dirty-on-load
    }
    return sample;
  }
}
