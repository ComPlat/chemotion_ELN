import React from 'react';
import PropTypes from 'prop-types';
import { Button, FormControl } from 'react-bootstrap';
import Select from 'react-select3';

const customStyles = {
  container: ({ marginLeft, ...css }) => ({
    marginLeft: '100px',
    marginRight: '35px',
    ...css
  }),
  menu: ({ width, ...css }) => ({ width: '465px', ...css })
};

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

    this.createDropdownTemplate = this.createDropdownTemplate.bind(this);
    this.removeDropdownTemplate = this.removeDropdownTemplate.bind(this);
    this.saveUserTemplates = this.saveUserTemplates.bind(this);
  }

  componentWillReceiveProps(newProps) {
    const [iconTemplates, dropdownTemplates] = getIconAndDropdown(newProps.template);
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

    const iconTemplates = this.toolbarSelectRef.current.state.value;
    const userTemplate = { _toolbar: iconTemplates.map(n => n.value) };

    const { dropdownTemplates } = this.state;
    dropdownTemplates.forEach((template) => {
      const selectRefs = this.toolbarDdSelectRefs.filter(r => r.id === template.id);
      const titleRefs = this.toolbarTitleRefs.filter(r => r.id === template.id);
      if (selectRefs.length === 0 || titleRefs.length === 0) return;

      const selectRef = selectRefs[0].ref;
      const selectedValue = selectRef.current.state.value;

      const titleRef = titleRefs[0].ref;
      // eslint-disable-next-line no-underscore-dangle
      const title = titleRef.current._reactInternalFiber.child.stateNode.value;

      userTemplate[title] = selectedValue.map(v => v.value);
    });

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
      if (!selectRef || !titleRef) return <span />;

      const ddSelected = template.data.map(n => ({ label: n, value: n }));
      const removeDropdown = () => this.removeDropdownTemplate(template);

      return (
        <div
          key={`ttc_dd_${name}_${id}`}
          style={{ marginTop: '10px' }}
        >
          <hr />
          <FormControl
            style={{ float: 'left', width: '90px', marginRight: '10px' }}
            // inputRef={(ref) => { this.setTitleRef(id, ref); }}
            ref={titleRef.ref}
            type="text"
            defaultValue={name}
          />
          <Button
            bsStyle="danger"
            bsSize="xs"
            onClick={removeDropdown}
            style={{ float: 'right', width: '25px', marginLeft: '10px' }}
          >
            <i className="fa fa-trash" />
          </Button>
          <Select
            styles={customStyles}
            ref={selectRef.ref}
            options={options}
            defaultValue={ddSelected}
            isMulti
            isSearchable
            closeMenuOnSelect={false}
          />
        </div>
      );
    });

    return (
      <div style={{ width: '600px' }}>
        <div>
          <Button
            bsStyle="success"
            onClick={this.saveUserTemplates}
          >
            Save
          </Button>
          &nbsp;&nbsp;
          <Button
            bsStyle="info"
            onClick={this.createDropdownTemplate}
          >
            New dropdown
          </Button>
        </div>
        <hr />
        <div style={{ marginTop: '10px' }}>
          <FormControl
            style={{ float: 'left', marginRight: '10px', width: '90px' }}
            type="text"
            disabled
            defaultValue="Toolbar"
          />
          <div style={{ marginRight: '35px' }}>
            <Select
              ref={this.toolbarSelectRef}
              styles={customStyles}
              defaultValue={iconSelected}
              options={options}
              isMulti
              isSearchable
              closeMenuOnSelect={false}
            />
          </div>
        </div>
        {dropdownTemplateSelector}
      </div>
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
