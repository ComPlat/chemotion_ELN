import React from 'react'
import {Table, Input, ListGroup, ListGroupItem, ButtonToolbar, Button} from 'react-bootstrap';

import ElementActions from './actions/ElementActions';

export default class LiteraturesForm extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      title: "",
      url: ""
    }
  }

  handleUrlChanged(e) {
    let url = e.target.value;
    this.setState({
      url: url
    });
  }

  handleTitleChanged(e) {
    let title = e.target.value;
    this.setState({
      title: title
    });
  }

  _submitFunction() {
    let params = {
      reaction_id: this.props.reaction_id,
      title: this.state.title,
      url: this.state.url
    }
    this.setState({
      title: "",
      url: ""
    })
    ElementActions.createReactionLiterature(params);
  }

  render() {
    return (
      <form>
        <table width="100%">
          <tr>
            <td className="padding-right">
              <Input type="text" label="Title" ref="titleInput" id="titleInput"
                onChange={(e) => this.handleTitleChanged(e)}
                placeholder={'-- Please Insert Title --'}
                value={this.state.title}
              />
            </td>
            <td>
              <Input type="text" label="URL" ref="urlInput" id="urlInput"
                onChange={(e) => this.handleUrlChanged(e)}
                placeholder={'-- Please Insert URL --'}
                value={this.state.url}
              />
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <ButtonToolbar>
                <Button bsStyle="warning" onClick={this._submitFunction.bind(this)}>Add Literature</Button>
              </ButtonToolbar>
            </td>
          </tr>
        </table>
      </form>
    );
  }

}
