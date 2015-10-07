import React from 'react'
import {Table, Input, ListGroup, ListGroupItem, ButtonToolbar, Button} from 'react-bootstrap';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';

export default class LiteraturesForm extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      reaction_id: props.reaction_id,
      title: "",
      url: ""
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    let element = state.currentElement
    this.setState({
      reaction_id: element ? element.id : undefined
    });
  }

  handleUrlChanged(e) {
    url = this.refs.urlInput.getValue();
    this.setState({
      url: url
    });
  }

  handleTitleChanged(e) {
    title = this.refs.titleInput.getValue();
    this.setState({
      title: title
    });
  }

  _submitFunction() {
    let paramObj = {
      reaction_id: this.state.reaction_id,
      title: this.refs.titleInput.getValue(),
      url: this.refs.urlInput.getValue()
    }
    ElementActions.createReactionLiterature(paramObj);
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
