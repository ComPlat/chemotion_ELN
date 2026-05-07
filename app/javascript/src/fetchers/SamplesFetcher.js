import ApiClient from 'src/api_clients/ChemotionApiClient';
import { Map } from 'immutable';

import Sample from 'src/models/Sample';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import BaseFetcher from 'src/fetchers/BaseFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import Literature from 'src/models/Literature';

export default class SamplesFetcher {
  static fetchByCollectionId(id, queryParams = {}, moleculeSort = false) {
    const updatedQueryParams = { ...queryParams, moleculeSort };
    return BaseFetcher.fetchByCollectionId(id, updatedQueryParams, 'samples', Sample);
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

        // build literature map by literal_id
        const literatures = (json.literatures || []).reduce(
          (acc, l) => acc.set(l.literal_id, new Literature(l)),
          Map()
        );

        // attach literatures per sample BEFORE enrichment
        samples.forEach((sample) => {
          const sampleLits = literatures.filter(
            (l) => l.element_id === sample.id
          );

          if (sampleLits.size > 0) {
            sample.literatures = sampleLits;
            sample.updateChecksum(); // prevent dirty-on-load
          }
        });

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
    const promise = () => ApiClient.postJson('/api/v1/samples', { body: sample.serialize() })
      .then((json) => GenericElsFetcher.uploadGenericFiles(sample, json.sample.id, 'Sample')
        .then(() => this.sampleElement(json, json.sample.id)));

    return AttachmentFetcher.uploadNewAttachmentsForContainer(sample.container).then(() => promise());
  }

  static update(sample) {
    const promise = () => ApiClient.putJson(`/api/v1/samples/${sample.id}`, { body: sample.serialize() })
      .then((json) => GenericElsFetcher.uploadGenericFiles(sample, json.sample.id, 'Sample')
        .then(() => BaseFetcher.updateAnnotationsInContainer(sample))
        .then(() => this.sampleElement(json, json.sample.id)));

    return AttachmentFetcher.uploadNewAttachmentsForContainer(sample.container)
      .then(() => promise());
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

    return ApiClient.postJson('/api/v1/samples/import', { body: data });
  }

  static importSamplesFromFileConfirm(params) {
    const body = {
      currentCollectionId: params.currentCollectionId,
      rows: params.rows,
      mapped_keys: params.mapped_keys,
    };

    return ApiClient.postJson('/api/v1/samples/confirm_import', { body })
      .then((json) => {
        if (Array.isArray(json.error_messages)) {
          json.error_messages.forEach((message) => {
            NotificationActions.add({
              message,
              level: 'error',
              autoDismiss: 10
            });
          });
        } else {
          NotificationActions.add({
            message: json.error_messages || json.message,
            level: json.message ? 'success' : 'error',
            autoDismiss: 10
          });
        }
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
        if (response.ok === false) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      },
      handleResponseError: (exception) => {
        console.error('Error batch refreshing SVGs:', exception);
        throw exception;
      }
    })
      .then((json) => json.results || []);
  }

  static sampleElement(json, id) {
    const sample = new Sample(json.sample);
    if (json.literatures && json.literatures.length > 0) {
      const tliteratures = json.literatures.map((literature) => new Literature(literature));
      const lits = tliteratures.reduce((acc, l) => acc.set(l.literal_id, l), new Map());
      sample.literatures = lits;
      sample.updateChecksum();
    }
    if (json.error) {
      sample.id = `${id}:error:Sample ${id} is not accessible!`;
    }
    return sample;
  }
}
