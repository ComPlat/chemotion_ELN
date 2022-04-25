import React from 'react';
import PropTypes from 'prop-types';
import { DropdownButton, MenuItem } from 'react-bootstrap';

export default class EditMdlBtn extends React.Component {
  constructor() {
    super();

    this.onSelect = this.onSelect.bind(this);
  }

  onSelect(id) {
    this.props.openKetcher(id);
  }

  render() {
    const { options, identifier } = this.props;

    if (options.length === 0 || !identifier) return <span />;

    const icon = (<i className="fa fa-pencil" />);
    const ddId = `dropdown-edit-mdl-${identifier}`;

    return (
      <DropdownButton
        id={ddId}
        title={icon}
        className="clipboard-btn left-btn btn btn-xs"
      >
        {options.map(option => (
          <MenuItem
            key={option.value}
            eventKey={option.value}
            onSelect={this.onSelect}
          >
            {option.title}
          </MenuItem>
        ))}
      </DropdownButton>
    );
  }
}

EditMdlBtn.propTypes = {
  identifier: PropTypes.number,
  openKetcher: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.object),
};

EditMdlBtn.defaultProps = {
  options: [],
  identifier: 0,
};
