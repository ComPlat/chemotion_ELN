import React from 'react';

import { Container, Col, Row } from 'react-bootstrap';

import TextTemplatesFetcher from 'src/fetchers/TextTemplatesFetcher';
import TextTemplateForm from 'src/apps/admin/textTemplates/TextTemplateForm';
import TextTemplateSelector from 'src/apps/admin/textTemplates/TextTemplateSelector';


export default class TextTemplateContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      templateNames: [],
      fetchedTemplates: {},
      selectedTemplateName: null,
    };

    this.addTemplate = this.addTemplate.bind(this);
    this.renameTemplate = this.renameTemplate.bind(this);
    this.removeTemplate = this.removeTemplate.bind(this);
    this.updateTemplate = this.updateTemplate.bind(this);
    this.selectTemplate = this.selectTemplate.bind(this);
  }

  componentDidMount() {
    TextTemplatesFetcher.fetchPredefinedTemplateNames().then((res) => {
      this.setState({ templateNames: res });
    });
  }

  addTemplate(gridApi) {
    const { templateNames, fetchedTemplates } = this.state;

    this.setState({
      templateNames: ['', ...templateNames],
      fetchedTemplates: {
        ...fetchedTemplates,
        '': { name: '', data: {} },
      },
      selectedTemplateName: '',
    }, () => {
      if (gridApi) {
        gridApi.startEditingCell({ rowIndex: 0, colKey: 'name' });
      }
    });
  }

  selectTemplate(name) {
    const { fetchedTemplates, selectedTemplateName } = this.state;
    if (name === selectedTemplateName && fetchedTemplates[name]) return;

    if (fetchedTemplates[name]) {
      this.setState({ selectedTemplateName: name });
    } else {
      TextTemplatesFetcher.fetchPredefinedTemplateByNames([name]).then((res) => {
        if (!res) return;

        const newTemplates = {};
        res.forEach((r) => newTemplates[r.name] = r);

        this.setState({
          fetchedTemplates: {
            ...fetchedTemplates,
            ...newTemplates,
          },
          selectedTemplateName: name,
        });
      });
    }
  }

  removeTemplate(name) {
    TextTemplatesFetcher.deletePredefinedTemplateByName(name).then((res) => {
      if (!res) return;

      const { templateNames, fetchedTemplates, selectedTemplateName } = this.state;
      const newFetchedTemplates = { ...fetchedTemplates };
      delete newFetchedTemplates[name];

      this.setState({
        templateNames: templateNames.filter((n) => n !== name),
        fetchedTemplates: newFetchedTemplates,
        selectedTemplateName: selectedTemplateName === name ? null : selectedTemplateName,
      });
    });
  }

  renameTemplate(oldName, newName) {
    const { templateNames, fetchedTemplates, selectedTemplateName } = this.state;
    const template = fetchedTemplates[oldName];

    const newTemplate = {...template, name: newName};
    const newFetchedTemplates = { ...fetchedTemplates, [newName]: newTemplate };
    delete newFetchedTemplates[oldName];

    TextTemplatesFetcher.updatePredefinedTemplates(newTemplate).then((res) => {
      if (!res) return;

      this.setState({
        templateNames: templateNames.with(templateNames.indexOf(oldName), newName),
        fetchedTemplates: newFetchedTemplates,
        selectedTemplateName: selectedTemplateName === oldName ? newName : selectedTemplateName,
      });
    });
  }

  updateTemplate(template) {
    const { fetchedTemplates } = this.state;
    TextTemplatesFetcher.updatePredefinedTemplates(template).then((res) => {
      if (!res) return;

      this.setState({
        fetchedTemplates: {
          ...fetchedTemplates,
          [template.name]: template
        }
      });
    });
  }

  render() {
    const {
      templateNames,
      fetchedTemplates,
      selectedTemplateName,
    } = this.state;

    const selectedTemplate = fetchedTemplates[selectedTemplateName];

    return (
      <Container fluid className="vh-100">
        <Row className="vh-100">
          <Col md={3}>
            <TextTemplateSelector
              templateNames={templateNames}
              addTemplate={this.addTemplate}
              selectTemplate={this.selectTemplate}
              renameTemplate={this.renameTemplate}
              removeTemplate={this.removeTemplate}
            />
          </Col>
          <Col md={9}>
            {selectedTemplate ? (
              <TextTemplateForm
                selectedTemplate={selectedTemplate}
                updateTemplate={this.updateTemplate}
              />
            ) : (
              <h3>Select a template to edit</h3>
            )}
          </Col>
        </Row>
      </Container>
    );
  }
}
