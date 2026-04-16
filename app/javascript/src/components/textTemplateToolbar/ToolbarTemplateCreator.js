import React from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar, Button, Form, Popover } from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';

const MT_ID = 0;

const getIconAndDropdown = (template) => {
  const reservedKeys = ['_toolbar', '_mt', '_mt_label'];
  const dropdownTemplates = Object.keys(template)
    .filter(k => !reservedKeys.includes(k))
    .map((k, idx) => ({ id: idx + 1, name: k, data: template[k] }));

  // eslint-disable-next-line no-underscore-dangle
  const toolbarTemplate = template._toolbar || [];

  const mtDropdown = {
    id: MT_ID,
    // eslint-disable-next-line no-underscore-dangle
    name: template._mt_label || 'MT',
    // eslint-disable-next-line no-underscore-dangle
    data: template._mt || [],
    isMT: true,
  };

  return [toolbarTemplate, [mtDropdown, ...dropdownTemplates]];
};

export default class ToolbarTemplateCreator extends React.Component {
  constructor(props) {
    super(props);

    this.toolbarSelectRef = React.createRef();

    const [iconTemplates, dropdownTemplates] = getIconAndDropdown(props.template);

    this.state = { iconTemplates, dropdownTemplates, personalTemplates: [] };

    this.toolbarDdSelectRefs = dropdownTemplates.map(dd => ({
      id: dd.id,
      ref: React.createRef()
    }));
    this.toolbarTitleRefs = dropdownTemplates.map(dd => ({
      id: dd.id,
      ref: React.createRef()
    }));
    this.id = Math.max(...dropdownTemplates.map(d => d.id)) + 1;

    this.state.personalTemplates = TextTemplateStore.getState().personalTemplates || [];
    this.onStoreChange = this.onStoreChange.bind(this);
    this.setTitleRef = this.setTitleRef.bind(this);
    this.onChangeDropdown = this.onChangeDropdown.bind(this);

    this.createDropdownTemplate = this.createDropdownTemplate.bind(this);
    this.removeDropdownTemplate = this.removeDropdownTemplate.bind(this);
    this.saveUserTemplates = this.saveUserTemplates.bind(this);
  }

  componentDidMount() {
    TextTemplateStore.listen(this.onStoreChange);
    TextTemplateActions.fetchPersonalTemplates();
  }

  componentWillUnmount() {
    TextTemplateStore.unlisten(this.onStoreChange);
  }

  onStoreChange({ personalTemplates }) {
    this.setState({ personalTemplates: personalTemplates || [] });
  }

  componentDidUpdate(prevProps) {
    const { template } = this.props;
    if (JSON.stringify(template) === JSON.stringify(prevProps.template)) return;

    const [iconTemplates, dropdownTemplates] = getIconAndDropdown(template);
    this.toolbarDdSelectRefs = dropdownTemplates.map(dd => ({
      id: dd.id,
      ref: React.createRef()
    }));
    this.toolbarTitleRefs = dropdownTemplates.map(dd => ({
      id: dd.id,
      ref: React.createRef()
    }));
    this.id = Math.max(0, ...dropdownTemplates.map(d => d.id)) + 1;

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

      if (template.isMT) {
        // eslint-disable-next-line no-underscore-dangle
        userTemplate._mt = selectedValue.map(v => v.value);
        // eslint-disable-next-line no-underscore-dangle
        userTemplate._mt_label = tempName;
      } else {
        userTemplate[tempName] = selectedValue.map(v => v.value);
      }
    });
    this.setState({ dropdownTemplates });
    updateTextTemplates(userTemplate);
  }

  render() {
    const { templateOptions } = this.props;
    const { iconTemplates, dropdownTemplates, personalTemplates } = this.state;

    const personalNames = personalTemplates.map(t => t.name);
    const allOptions = [
      ...templateOptions,
      ...personalNames.filter(n => !templateOptions.includes(n))
    ].map(n => ({ label: n, value: n }));

    const validOptionNames = new Set(allOptions.map(o => o.value));
    const iconSelected = iconTemplates
      .filter(n => validOptionNames.has(n))
      .map(n => ({ label: n, value: n }));

    const dropdownTemplateSelector = dropdownTemplates.map((template) => {
      const { name, id, isMT } = template;
      const selectRef = this.toolbarDdSelectRefs.filter(r => (
        r.id === template.id
      ))[0];
      const titleRef = this.toolbarTitleRefs.filter(r => (
        r.id === template.id
      ))[0];
      if (!selectRef || !titleRef) { return null; }

      const ddSelected = template.data
        .filter(n => validOptionNames.has(n))
        .map(n => ({ label: n, value: n }));
      const removeDropdown = () => this.removeDropdownTemplate(template);

      return (
        <div key={`ttc_dd_${name}_${id}`}>
          <hr />
          <div className="d-flex gap-2 mt-2" style={{ minWidth: '475px', maxWidth: '775px' }}>
            <Form.Control
              className="col2"
              onChange={e => this.onChangeDropdown('DropdownName', e, id)}
              ref={titleRef.ref}
              type="text"
              defaultValue={name}
            />
            <Select
              className="me-2 col-9 f-5"
              ref={selectRef.ref}
              options={allOptions}
              defaultValue={ddSelected}
              onChange={e => this.onChangeDropdown('DropdownData', e, id)}
              isMulti
              isSearchable
              closeMenuOnSelect={false}
              usePortal={false}
            />
            <Button
              variant="danger"
              size="sm"
              onClick={removeDropdown}
              disabled={isMT}
              title={isMT ? 'Personal templates dropdown cannot be removed' : undefined}
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
          <ButtonToolbar>
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
            <Button
              variant="light"
              href="/my_templates"
              title="Manage my personal templates"
            >
              <i className="fa fa-file-text-o me-1" />
              My Templates
            </Button>
          </ButtonToolbar>
          <hr />
          <div className="d-flex gap-2 mt-2" style={{ minWidth: '475px', maxWidth: '775px' }}>
            <Form.Control
              type="text"
              className="col2"
              disabled
              defaultValue="Toolbar"
            />
            <Select
              className="me-5 col-9 f-5"
              ref={this.toolbarSelectRef}
              defaultValue={iconSelected}
              options={allOptions}
              isMulti
              isSearchable
              closeMenuOnSelect={false}
              usePortal={false}
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
  updateTextTemplates: PropTypes.func,
};

ToolbarTemplateCreator.defaultProps = {
  template: {},
  templateOptions: [],
  updateTextTemplates: null,
};
