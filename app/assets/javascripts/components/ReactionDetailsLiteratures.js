import React from 'react'
import {Table, Input, ListGroup, ListGroupItem, ButtonToolbar, Button} from 'react-bootstrap';

import ElementActions from './actions/ElementActions';
import ElementStore from './stores/ElementStore';


export default class ReactionDetailsLiteratures extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      literatures: props.literatures || [],
      reaction_id: props.reaction_id
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
    if(state.currentElement) {
      this.setState({
        literatures: element ? element.literatures : [],
        reaction_id: element ? element.id : undefined
      });
    }
  }

  _deleteLiterature(literature) {
    ElementActions.deleteReactionLiterature(literature);
  }

  _displayLiteratureRows() {
    let {literatures} = this.state;
    return literatures.map((element) => {
      return (
        <tr>
          <td width="45%" className="padding-right"> {element.title}  </td>
          <td width="50%" className="padding-right"> {element.url} </td>
          <td width="5%">
            <Button bsSize="xsmall" bsStyle="danger" onClick={this._deleteLiterature.bind(this, element)}>
              <i className="fa fa-trash-o"></i>
            </Button>
          </td>
        </tr>
      )
    });
  }

  _submitFunction() {
    let paramObj = {
      reaction_id: this.state.reaction_id,
      title: this.refs.titleInput.getValue(),
      url: this.refs.urlInput.getValue()
    }
    document.getElementById("titleInput").value = "";
    document.getElementById("urlInput").value = "";
    ElementActions.createReactionLiterature(paramObj);
  }

  render() {
    return (
      <ListGroup fill>
        <Table width="100%">
          <tbody>
            {this._displayLiteratureRows()}
          </tbody>
        </Table>
        <ListGroupItem>
          <form>
            <table width="100%">
              <tr>
                <td className="padding-right">
                  <Input type="text" label="Title" ref="titleInput" id="titleInput"
                    placeholder={'-- Please Insert Title --'}
                  />
                </td>
                <td>
                  <Input type="text" label="URL" ref="urlInput" id="urlInput"
                    placeholder={'-- Please Insert URL --'}
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
        </ListGroupItem>
      </ListGroup>
    );
  }

}
