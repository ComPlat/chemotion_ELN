import GenericBaseFetcher from 'src/fetchers/GenericBaseFetcher';

export default class GenericDSsFetcher extends GenericBaseFetcher {
  static exec(path, method) {
    return super.exec(`generic_dataset/${path}`, method);
  }

  static execData(params, path) {
    return super.execData(params, `generic_dataset/${path}`);
  }

  static fetchRepo() {
    return this.exec('fetch_repo', 'GET');
  }

  static createRepo(params) {
    return this.execData(params, 'create_repo_klass');
  }

  static fetchKlass() {
    return this.exec('klasses.json', 'GET');
  }

  static listDatasetKlass(params = {}) {
    const api =
      params.is_active === undefined
        ? 'list_dataset_klass.json'
        : `list_dataset_klass.json?is_active=${params.is_active}`;
    return this.exec(api, 'GET');
  }

  static updateDatasetTemplate(params) {
    return super.updateTemplate(
      { ...params, klass: 'DatasetKlass' },
      'update_dataset_template'
    );
  }
}
