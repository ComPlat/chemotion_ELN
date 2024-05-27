/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup, FormControl, ListGroup, ListGroupItem, Button
} from 'react-bootstrap';

export default class HyperLinksSection extends Component {
  constructor(props) {
    super(props);
    this.state = {
      link: null
    };

    this.handleAddLink = this.handleAddLink.bind(this);
    this.handleLinkInputChange = this.handleLinkInputChange.bind(this);
    this.handleRemoveLink = this.handleRemoveLink.bind(this);
  }

  handleLinkInputChange(event) {
    const { value } = event.target;

    this.setState({ link: value });
  }

  handleAddLink() {
    const { link } = this.state;
    this.props.onAddLink(link);
    this.setState({ link: null });
  }

  handleRemoveLink(link) {
    this.props.onRemoveLink(link);
  }

  removeLinkButton(link) {
    const { readOnly, disabled } = this.props;
    if (!readOnly && !disabled) {
      return (
        <Button size="sm" variant="danger" onClick={() => this.handleRemoveLink(link)}>
          <i className="fa fa-trash-o" />
        </Button>
      );
    }
    return null;
  }

  listLinkItem(link) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px'
      }}
      >
        <a href={link} style={{ cursor: 'pointer' }} target="_blank" rel="noreferrer">{link}</a>
        {this.removeLinkButton(link)}
      </div>
    );
  }

  renderHyperLinkInput() {
    const { link } = this.state;
    const { disabled,readOnly } = this.props;

    if (disabled) {
      return <div />;
    }

    return (
      <FormGroup controlId="hyperlink" className="form-inline">
        <FormControl
          type="text"
          value={link || ''}
          onChange={(event) => this.handleLinkInputChange(event)}
          bsClass="form-control"
          size="sm"
          disabled={disabled || readOnly}
          style={{ width: '90%' }}
        />
        <Button
          className="button-right"
          variant="success"
          onClick={this.handleAddLink}
          disabled={link == null || readOnly}
          size="sm"
          style={{ width: '8%' }}
        >
          Add
        </Button>
      </FormGroup>
    );
  }

  renderHyperLinkList() {
    const { data } = this.props;
    let hyperLinks = data;
    if (typeof hyperLinks === 'string' || hyperLinks instanceof String) {
      hyperLinks = JSON.parse(hyperLinks);
    }

    if (hyperLinks && hyperLinks.length > 0) {
      return (
        <div className="list">
          <ListGroup>
            {
              hyperLinks.map((link) => (
                <ListGroupItem key={link} style={{ margin: 'unset', padding: 'unset' }}>
                  {this.listLinkItem(link)}
                </ListGroupItem>
              ))
            }
          </ListGroup>
        </div>
      );
    }
    return null;
  }

  render() {
    return (
      <div>
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label>Hyperlinks</label>
        {this.renderHyperLinkInput()}
        {this.renderHyperLinkList()}
      </div>
    );
  }
}

HyperLinksSection.propTypes = {
  data: PropTypes.arrayOf(PropTypes.string),
  onAddLink: PropTypes.func.isRequired,
  onRemoveLink: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  readOnly: PropTypes.bool,
};

HyperLinksSection.defaultProps = {
  disabled: false,
  readOnly: false,
  data: undefined
};
