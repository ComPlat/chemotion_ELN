import { Map, fromJS } from 'immutable';

import alt from '../alt';

import TextTemplateActions from '../actions/TextTemplateActions';

class TextTemplateStore {
  constructor() {
    this.state = {
      sample: Map(),
      reaction: Map(),
      screen: Map(),
      wellplate: Map(),
      researchPlan: Map(),
    };

    this.bindListeners({
      handleFetchTextTemplates: TextTemplateActions.fetchTextTemplates,
      handleUpdateTextTemplates: TextTemplateActions.updateTextTemplates,
    });
  }

  handleFetchTextTemplates(templates) {
    Object.keys(templates).forEach((templateType) => {
      const templateVal = templates[templateType];
      this.state[templateType] = fromJS(templateVal);
    });
  }

  handleUpdateTextTemplates(templates) {
    Object.keys(templates).forEach((templateType) => {
      const templateVal = templates[templateType];
      this.state[templateType] = fromJS(templateVal);
    });
  }
}

export default alt.createStore(TextTemplateStore, 'TextTemplateStore');
