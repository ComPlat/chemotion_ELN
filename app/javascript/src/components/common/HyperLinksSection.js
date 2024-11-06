/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, ListGroup, ListGroupItem, Button } from 'react-bootstrap';

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
      <div className='d-flex justify-content-between align-items-center m-2'>
        <a href={link} role="button" target="_blank" rel="noreferrer">{link}</a>
        {this.removeLinkButton(link)}
      </div>
    );
  }

  renderHyperLinkInput() {
    const { link } = this.state;
    const { disabled,readOnly } = this.props;

    if (disabled) {
      return null;
    }

    return (
      <Form.Group controlId="hyperlink" className="d-flex align-items-center mb-3">
        <Form.Control
          type="text"
          value={link || ''}
          onChange={(event) => this.handleLinkInputChange(event)}
          size="md"
          disabled={disabled || readOnly}
          className='me-2'
        />
        <Button
          variant="success"
          onClick={this.handleAddLink}
          disabled={link == null || readOnly}
          size="sm"
        >
          Add
        </Button>
      </Form.Group>
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
                <ListGroupItem key={link} className='m-0 p-0'>
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
        <Form.Label>Hyperlinks</Form.Label>
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
