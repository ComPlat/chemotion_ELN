import React from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar, Button, Form, Popover } from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
// import { template } from 'lodash';

const getIconAndDropdown = (template) => {
  const dropdownTemplates = Object.keys(template).filter(k => (
    k !== '_toolbar'
  )).map((k, idx) => (
    { id: idx + 1, name: k, data: template[k] }
  ));

  // eslint-disable-next-line no-underscore-dangle
  const toolbarTemplate = template._toolbar || [];
  return [toolbarTemplate, dropdownTemplates];
};

export default class ToolbarTemplateCreator extends React.Component {
  constructor(props) {
    super(props);

    this.toolbarSelectRef = React.createRef();

    const [iconTemplates, dropdownTemplates] = getIconAndDropdown(props.template);
    this.state = { iconTemplates, dropdownTemplates };

    this.toolbarDdSelectRefs = dropdownTemplates.map(dd => ({
      id: dd.id,
      ref: React.createRef()
    }));
    this.toolbarTitleRefs = dropdownTemplates.map(dd => ({
      id: dd.id,
      ref: React.createRef()
    }));
    this.id = dropdownTemplates.length + 1;

    this.setTitleRef = this.setTitleRef.bind(this);
    this.onChangeDropdown = this.onChangeDropdown.bind(this);

    this.createDropdownTemplate = this.createDropdownTemplate.bind(this);
    this.removeDropdownTemplate = this.removeDropdownTemplate.bind(this);
    this.saveUserTemplates = this.saveUserTemplates.bind(this);
  }

  componentDidUpdate(prevProps) {
    const { template } = this.props;
    if (template === prevProps.template) return;

    const [iconTemplates, dropdownTemplates] = getIconAndDropdown(template);
    this.toolbarDdSelectRefs = dropdownTemplates.map(dd => ({
      id: dd.id,
      ref: React.createRef()
    }));
    this.toolbarTitleRefs = dropdownTemplates.map(dd => ({
      id: dd.id,
      ref: React.createRef()
    }));
    this.id = dropdownTemplates.length + 1;

    this.setState({ iconTemplates, dropdownTemplates });
  }

  onChangeDropdown(type, e, id) {
    const { dropdownTemplates } = this.state;

    const tempOnChange = dropdownTemplates.filter(template => template.id === id);
    if (type === 'DropdownName') {
      tempOnChange[0].name = e.target.value;
    } else {
      const dataValues = [];
      e.forEach((object) => {
        const tabContent = object.value;
        if (tabContent) { dataValues.push(tabContent); }
      });
      tempOnChange[0].data = dataValues;
    }
  }

  setTitleRef(id, ref) {
    const refIdx = this.toolbarTitleRefs.findIndex(r => r.id === id);
    if (refIdx < 0) return;

    const titleRef = this.toolbarTitleRefs[refIdx];
    titleRef.ref = ref;
    this.toolbarTitleRefs[refIdx] = titleRef;
  }

  createDropdownTemplate() {
    const { dropdownTemplates } = this.state;

    this.toolbarDdSelectRefs.push({ id: this.id, ref: React.createRef() });
    this.toolbarTitleRefs.push({ id: this.id, ref: React.createRef() });

    const newDd = { id: this.id, name: '', data: [] };
    this.setState({
      dropdownTemplates: dropdownTemplates.concat([newDd])
    });
    this.id += 1;
  }

  removeDropdownTemplate(template) {
    const { dropdownTemplates } = this.state;
    const newDropdowTemplates = dropdownTemplates.filter(dd => (
      dd.id !== template.id
    ));

    this.setState({ dropdownTemplates: newDropdowTemplates }, () => {
      this.toolbarDdSelectRefs = this.toolbarDdSelectRefs.filter(ref => (
        ref.id !== template.id
      ));
      this.toolbarTitleRefs = this.toolbarTitleRefs.filter(ref => (
        ref.id !== template.id
      ));
    });
  }

  saveUserTemplates() {
    const { updateTextTemplates } = this.props;
    if (!updateTextTemplates) return;

    const iconTemplates = this.toolbarSelectRef.current.state.selectValue;
    const userTemplate = { _toolbar: iconTemplates.map(n => n.value) };

    const { dropdownTemplates } = this.state;
    dropdownTemplates.forEach((template) => {
      const selectRefs = this.toolbarDdSelectRefs.filter(r => r.id === template.id);
      const titleRefs = this.toolbarTitleRefs.filter(r => r.id === template.id);
      if (selectRefs.length === 0 || titleRefs.length === 0) return;

      const selectRef = selectRefs[0].ref;
      const selectedValue = selectRef.current.state.selectValue;

      const tempName = template.name;
      userTemplate[tempName] = selectedValue.map(v => v.value);
    });
    this.setState({ dropdownTemplates });
    updateTextTemplates(userTemplate);
  }

  render() {
    const { templateOptions } = this.props;
    const options = templateOptions.map(n => ({ label: n, value: n }));

    const { iconTemplates, dropdownTemplates } = this.state;
    const iconSelected = iconTemplates.map(n => ({ label: n, value: n }));

    const dropdownTemplateSelector = dropdownTemplates.map((template) => {
      const { name, id } = template;
      const selectRef = this.toolbarDdSelectRefs.filter(r => (
        r.id === template.id
      ))[0];
      const titleRef = this.toolbarTitleRefs.filter(r => (
        r.id === template.id
      ))[0];
      if (!selectRef || !titleRef) { return null; }

      const ddSelected = template.data.map(n => ({ label: n, value: n }));
      const removeDropdown = () => this.removeDropdownTemplate(template);

      return (
        <div key={`ttc_dd_${name}_${id}`}>
          <hr />
          <div
            className="d-flex gap-2 mt-2"
            style={{ maxWidth: '775px' }}
          >
            <Form.Control
              className="col"
              onChange={e => this.onChangeDropdown('DropdownName', e, id)}
              ref={titleRef.ref}
              type="text"
              defaultValue={name}
            />
            <Select
              className="me-2 col-10 f-5"
              ref={selectRef.ref}
              options={options}
              defaultValue={ddSelected}
              onChange={e => this.onChangeDropdown('DropdownData', e, id)}
              isMulti
              isSearchable
              closeMenuOnSelect={false}
            />
            <Button
              variant="danger"
              size="sm"
              onClick={removeDropdown}
            >
              <i className="fa fa-trash" />
            </Button>
          </div>
        </div>
      );
    });

    return (
      <>
        <Popover.Header as="h3">Custom toolbar</Popover.Header>
        <Popover.Body>
          <ButtonToolbar className="gap-2">
            <Button
              variant="success"
              onClick={this.saveUserTemplates}
            >
              Save
            </Button>
            <Button
              variant="info"
              onClick={this.createDropdownTemplate}
            >
              New dropdown
            </Button>
          </ButtonToolbar>
          <hr />
          <div className="d-flex gap-2 mt-2" style={{ maxWidth: '775px' }}>
            <Form.Control
              type="text"
              className="col"
              disabled
              defaultValue="Toolbar"
            />
            <Select
              className="me-5 col-10 f-5"
              ref={this.toolbarSelectRef}
              defaultValue={iconSelected}
              options={options}
              isMulti
              isSearchable
              closeMenuOnSelect={false}
            />
          </div>
          {dropdownTemplateSelector}
        </Popover.Body>
      </>
    );
  }
}

ToolbarTemplateCreator.propTypes = {
  /* eslint-disable react/forbid-prop-types */
  template: PropTypes.object,
  templateOptions: PropTypes.arrayOf(PropTypes.string),
  /* eslint-enable react/forbid-prop-types */
  updateTextTemplates: PropTypes.func
};

ToolbarTemplateCreator.defaultProps = {
  template: {},
  templateOptions: [],
  updateTextTemplates: null
};
