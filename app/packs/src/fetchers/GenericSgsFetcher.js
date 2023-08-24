import GenericBaseFetcher from 'src/fetchers/GenericBaseFetcher';

export default class GenericSgsFetcher extends GenericBaseFetcher {
  static exec(path, method) {
    return super.exec(`segments/${path}`, method);
  }
  static execData(params, path) {
    return super.execData(params, `segments/${path}`);
  }

  static fetchRepo() {
    return this.exec('fetch_repo', 'GET');
  }

  static createRepo(params) {
    return this.execData(params, 'create_repo_klass');
  }

  static createKlass(params) {
    return this.execData(params, 'create_segment_klass');
  }

  static fetchKlass(elementName = null) {
    const api =
      elementName == null
        ? 'klasses.json'
        : `klasses.json?element=${elementName}`;
    return this.exec(api, 'GET');
  }

  static fetchRepoKlassList() {
    return this.exec('fetch_repo_generic_template_list', 'GET');
  }

  static listSegmentKlass(params = {}) {
    const api =
      params.is_active === undefined
        ? 'list_segment_klass.json'
        : `list_segment_klass.json?is_active=${params.is_active}`;
    return this.exec(api, 'GET');
  }

  static syncTemplate(params) {
    return this.execData(params, 'fetch_repo_generic_template');
  }

  static updateSegmentKlass(params) {
    return this.execData(params, 'update_segment_klass');
  }

  static updateSegmentTemplate(params) {
    return super.updateTemplate(
      { ...params, klass: 'SegmentKlass' },
      'update_segment_template'
    );
  }
}
