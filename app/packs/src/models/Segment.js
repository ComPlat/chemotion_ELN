import { cloneDeep } from 'lodash';
import { buildInitWF, resetProperties } from 'chem-generic-ui';
import Element from 'src/models/Element';

export default class Segment extends Element {
  static buildEmpty(klass) {
    const template = (klass && klass.properties_release) || {};
    return new Segment({
      segment_klass_id: this.segment_klass_id || (klass && klass.id),
      properties: buildInitWF(template),
      select_options: template.select_options || {},
      segment_klass: klass,
      properties_release: cloneDeep(template),
      files: [],
      wfLayers: template,
    });
  }

  static buildCopy(_segments) {
    const newSegments = cloneDeep(_segments);
    newSegments.map((_segment) => {
      // eslint-disable-next-line no-param-reassign
      _segment.properties = resetProperties(_segment.properties);
      return _segment;
    });
    return newSegments;
  }

  serialize() {
    return super.serialize({
      klassType: 'Segment',
      segment_klass: this.segment_klass,
      segment_klass_id: this.segment_klass_id,
      properties: this.properties,
      properties_release: this.properties_release,
      files: this.files,
    });
  }
}
