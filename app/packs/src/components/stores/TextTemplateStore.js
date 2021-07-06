import { Map, OrderedSet, fromJS } from 'immutable';

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
      reactionDescription: Map(),
      predefinedTemplateNames: OrderedSet(),
      fetchedPredefinedTemplates: Map()
    };

    this.bindListeners({
      handleFetchTextTemplates: TextTemplateActions.fetchTextTemplates,
      handleFetchPredefinedTemplateNames: TextTemplateActions.fetchPredefinedTemplateNames,
      handleUpdateTextTemplates: TextTemplateActions.updateTextTemplates,
      handleFetchTemplateByNames: TextTemplateActions.fetchPredefinedTemplateByNames,
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

  handleFetchPredefinedTemplateNames(names) {
    const { predefinedTemplateNames } = this.state;
    this.state.predefinedTemplateNames = predefinedTemplateNames.concat(OrderedSet(names));
  }

  handleFetchTemplateByNames(templates) {
    let fetchedTemplates = this.state.fetchedPredefinedTemplates;
    templates.forEach((template) => {
      fetchedTemplates = fetchedTemplates.set(template.name, fromJS(template));
    });

    this.state.fetchedPredefinedTemplates = fetchedTemplates;
  }
}

export default alt.createStore(TextTemplateStore, 'TextTemplateStore');
