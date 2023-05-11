import Element from 'src/models/Element';

export default class Container extends Element {
  static buildEmpty() {
    return new Container({
      name: 'new',
      children: [],
      attachments: [],
      is_deleted: false,
      description: '',
      extended_metadata: {
        report: true,
      },
      container_type: '',
    });
  }

  static buildAnalysis(kind = 'other', name = '') {
    const analysis = this.buildEmpty();
    analysis.container_type = 'analysis';
    analysis.extended_metadata.kind = kind;
    analysis.name = name;
    return analysis;
  }

  static init() {
    const root = this.buildEmpty();
    root.container_type = 'root';

    const analyses = this.buildEmpty();
    analyses.container_type = 'analyses';

    root.children.push(analyses);

    return root;
  }

  name() {
    return this.name;
  }

  switchPositionOfChildContainer(idToMove, idOfPredecessor) {
    const indexOfMovedContainer = this.children.findIndex((container) => container.id === idToMove);
    const indexOfPredecContainer = this.children.findIndex((container) => container.id === idOfPredecessor);

    const containerToMove = this.children[indexOfMovedContainer];
    this.children.splice(indexOfMovedContainer, 1);
    this.children.splice(indexOfPredecContainer, 0, containerToMove);
  }

  serialize() {
    return super.serialize({
      id: this.id,
      name: this.name,
      children: this.children,
      attachments: this.attachments.map((a) => a.serialize()),
      is_new: this.isNew || false,
      is_deleted: this.deleted || false,
      description: this.description,
      extended_metadata: this.extended_metadata,
      container_type: this.container_type,
    });
  }
}
