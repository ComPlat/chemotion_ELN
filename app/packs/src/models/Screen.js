import Element from 'src/models/Element';
import Wellplate from 'src/models/Wellplate';
import Container from 'src/models/Container';
import Segment from 'src/models/Segment';

export default class Screen extends Element {
  static buildEmpty(collectionID) {
    const descriptionDefault = {
      ops: [{ insert: '' }]
    };

    return new Screen({
      collection_id: collectionID,
      type: 'screen',
      name: 'New Screen',
      collaborator: '',
      requirements: '',
      conditions: '',
      result: '',
      description: descriptionDefault,
      wellplates: [],
      research_plans: [],
      container: Container.init(),
      segments: [],
      component_graph_data: {
        nodes: [],
        edges: []
      }
    });
  }

  static buildFromWellplatesAndCollectionId(clipboardWellplates, collection_id) {
    let descriptionDefault = {
      ops: [{ insert: "" }]
    };

    return new Screen({
      collection_id: collectionID,
      type: 'screen',
      name: 'New Screen with Wellplates',
      collaborator: '',
      requirements: '',
      conditions: '',
      result: '',
      description: descriptionDefault,
      wellplates: clipboardWellplates,
      research_plans: [],
      container: Container.init(),
      segments: [],
      component_graph_data: {
        nodes: [],
        edges: []
      }
    })
  }

  serialize() {
    return super.serialize({
      name: this.name,
      collaborator: this.collaborator,
      result: this.result,
      conditions: this.conditions,
      requirements: this.requirements,
      description: this.description,
      wellplate_ids: this.wellplateIDs,
      research_plan_ids: this.researchPlanIDs,
      container: this.container,
      segments: this.segments.map(s => s.serialize()),
      component_graph_data: this.component_graph_data
    })
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get collaborator() {
    return this._collaborator;
  }

  set collaborator(collaborator) {
    this._collaborator = collaborator;
  }

  get requirements() {
    return this._requirements;
  }

  set requirements(requirements) {
    this._requirements = requirements;
  }

  get conditions() {
    return this._conditions;
  }

  set conditions(conditions) {
    this._conditions = conditions;
  }

  get result() {
    return this._result;
  }

  set result(result) {
    this._result = result;
  }

  get description() {
    return this._description;
  }

  set description(description) {
    this._description = description;
  }

  get wellplates() {
    return this._wellplates;
  }

  set wellplates(wellplates) {
    this._wellplates = wellplates.map(w => new Wellplate(w));
  }

  get wellplateIDs() {
    return this._wellplates.map(w => w.id);
  }

  get researchPlanIDs() {
    return this.research_plans.map(rp => rp.id);
  }

  set segments(segments) {
    this._segments = (segments && segments.map(s => new Segment(s))) || [];
  }

  get segments() {
    return this._segments || [];
  }

  title() {
    return this.name;
  }

  get componentGraphData() {
    if (this.component_graph_data == {}) {
      return { nodes: {}, edges: {} }
    } else {
      return this.component_graph_data
    }
  }

  set componentGraphData(data) {
    if (data == {}) {
      console.debug('received empty component graph data!');
      this.component_graph_data = { nodes: {}, edges: {} };
    } else {
      this.component_graph_data = data;
    }
  }
}
