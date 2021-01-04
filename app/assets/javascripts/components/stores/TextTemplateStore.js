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
      predefinedTemplateNames: OrderedSet(),
    };

    this.bindListeners({
      handleFetchTextTemplates: TextTemplateActions.fetchTextTemplates,
      handleFetchPredefinedTemplateNames: TextTemplateActions.fetchPredefinedTemplateNames,
      handleUpdateTextTemplates: TextTemplateActions.updateTextTemplates,
      // handleFetchTemplateByName: TextTemplateActions.fetchTemplateByName,
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

  // handleFetchTemplateByName(template) {
  //   const { predefinedTemplates } = this.state;
  //   console.log(predefinedTemplates);
  //   const idx = predefinedTemplates.findIndex(t => t.name === template.name);

  //   // not found
  //   if (idx < 0) {
  //     this.state.predefinedTemplates = predefinedTemplates.push(template);
  //   } else {
  //     this.state.predefinedTemplateNames = predefinedTemplates.setIn(idx, fromJS(template));
  //   }
  // }
}

export default alt.createStore(TextTemplateStore, 'TextTemplateStore');
