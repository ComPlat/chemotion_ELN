import React from 'react';

import TextTemplatesFetcher from '../../components/fetchers/TextTemplatesFetcher';
import TextTemplate from './TextTemplate';

export default class TextTemplateContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      predefinedTemplateNames: [],
      fetchedTemplates: [],
    };

    this.addTemplate = this.addTemplate.bind(this);
    this.fetchTemplate = this.fetchTemplate.bind(this);
    this.removeTemplate = this.removeTemplate.bind(this);
    this.updateTemplate = this.updateTemplate.bind(this);
  }

  componentDidMount() {
    TextTemplatesFetcher.fetchPredefinedTemplateNames().then((res) => {
      const templateNames = res.map(n => ({ name: n }));
      this.setState({ predefinedTemplateNames: templateNames });
    });
  }

  addTemplate() {
    const { predefinedTemplateNames, fetchedTemplates } = this.state;

    this.setState({
      predefinedTemplateNames: [{ name: '' }, ...predefinedTemplateNames],
      fetchedTemplates: [
        { name: '', data: {} },
        ...fetchedTemplates
      ]
    }, () => {
      if (!this.gridApi) return;
      this.gridApi.startEditingCell({ rowIndex: 0, colKey: 'name' });
    });
  }

  fetchTemplate(name) {
    TextTemplatesFetcher.fetchPredefinedTemplateByNames([name]).then((res) => {
      if (!res) return;

      const { fetchedTemplates } = this.state;
      this.setState({
        fetchedTemplates: [...fetchedTemplates].concat(res),
      });
    });
  }

  removeTemplate(name) {
    TextTemplatesFetcher.deletePredefinedTemplateByName(name).then((res) => {
      if (!res) return;

      const { fetchedTemplates, predefinedTemplateNames } = this.state;
      this.setState({
        fetchedTemplates: fetchedTemplates.filter(t => t.name !== name),
        predefinedTemplateNames: predefinedTemplateNames.filter(t => (
          t.name !== name
        ))
      });
    });
  }

  updateTemplate(template) {
    const { fetchedTemplates } = this.state;
    const selectedNameIdx = fetchedTemplates.findIndex(t => (
      t.name === template.name
    ));
    if (selectedNameIdx < 0) return;

    const type = 'predefinedTextTemplate';
    TextTemplatesFetcher.updateTextTemplates(type, template).then((res) => {
      if (!res) return;

      this.setState({
        fetchedTemplates: fetchedTemplates.map((t, idx) => (
          (idx === selectedNameIdx) ? template : t
        ))
      });
    });
  }

  render() {
    const {
      predefinedTemplateNames,
      fetchedTemplates,
    } = this.state;

    return (
      <TextTemplate
        predefinedTemplateNames={predefinedTemplateNames}
        fetchedTemplates={fetchedTemplates}
        fetchTemplate={this.fetchTemplate}
        addTemplate={this.addTemplate}
        removeTemplate={this.removeTemplate}
        updateTemplate={this.updateTemplate}
      />
    );
  }
}
