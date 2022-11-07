import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl, Table, ListGroup, ListGroupItem, Button } from 'react-bootstrap';


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

    this.setState({ link: value })
  }

  handleAddLink() {
    const { link } = this.state;
    this.props.onAddLink(link);
    this.setState({ link: null })
  }

  renderHyperLinkInput() {
    const { link } = this.state;
    const { disabled } = this.props;

    if (disabled) {
      return <div></div>;
    }

    return (
      <FormGroup controlId='hyperlink' className="form-inline" >
        <FormControl
          type="text"
          value={link || ''}
          onChange={event => this.handleLinkInputChange(event)}
          bsClass="form-control"
          bsSize="small"
          style={{ width: '90%' }}
        />
        <Button
          className="button-right"
          bsStyle="success"
          onClick={this.handleAddLink}
          disabled={link == null}
          bsSize="small"
          style={{ width: '8%' }}
        >
          Add
        </Button>
      </FormGroup>
    );
  }

  renderHyperLinkList() {
    const { data } = this.props;
    let hyperLinks = data
    if (typeof hyperLinks === 'string' || hyperLinks instanceof String) {
      hyperLinks = JSON.parse(hyperLinks);
    }

    if (hyperLinks && hyperLinks.length > 0) {
      return (
        <div className="list">
          <ListGroup>
            {
              hyperLinks.map((link) => {
                return (
                  <ListGroupItem style={{ margin: 'unset', padding: 'unset' }}>
                    {this.listLinkItem(link)}
                  </ListGroupItem>
                );
              })
            }
          </ListGroup>
        </div>
      );
    }
    return (
      <div style={{ padding: 15 }}>
        There are currently no Datasets.<br />
      </div>
    );
  }

  handleRemoveLink(link) {
    this.props.onRemoveLink(link);
  }

  removeLinkButton(link) {
    const { readOnly, disabled } = this.props;
    if (!readOnly && !disabled) {
      return (
        <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleRemoveLink(link)}>
          <i className="fa fa-trash-o" />
        </Button>
      );
    }
  }

  listLinkItem(link) {
    return (
      <Table className="borderless" style={{ marginBottom: 'unset' }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'middle' }}>
              <a href={link} style={{ cursor: 'pointer' }} target="_blank">{link}</a><br />
              {this.removeLinkButton(link)}
            </td>
          </tr>
        </tbody>
      </Table>
    );
  }

  render() {
    return (
      <div>
        <label>Hyperlinks: </label>
        {this.renderHyperLinkInput()}
        {this.renderHyperLinkList()}
      </div>
    );
  }
}

HyperLinksSection.propTypes = {
  data: PropTypes.arrayOf(PropTypes.string).isRequired,
  onAddLink: PropTypes.func.isRequired,
  onRemoveLink: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};
