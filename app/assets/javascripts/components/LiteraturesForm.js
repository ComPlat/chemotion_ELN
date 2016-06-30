import React, {Component} from 'react'
import {Row, Col, FormControl, Button} from 'react-bootstrap';
import Literature from './models/Literature';

export default class LiteraturesForm extends Component {
  constructor() {
    super();
    this.state = {
      literature: Literature.buildEmpty()
    }
  }

  handleInputChange(type, event) {
    const {literature} = this.state;
    const {value} = event.target;
    switch(type) {
      case 'url':
        literature.url = value;
        break;
      case 'title':
        literature.title = value;
        break;
    }
    this.setState({literature});
  }

  handleLiteratureAdd() {
    const {literature} = this.state;
    this.props.onLiteratureAdd(literature);
    this.setState({
      literature: Literature.buildEmpty()
    })
  }

  titleInput() {
    return <FormControl
      type="text"
      onChange={event => this.handleInputChange('title', event)}
      placeholder={'Title...'}
      value={this.state.literature.title}
    />
  }

  urlInput() {
    return <FormControl
      type="text"
      onChange={event => this.handleInputChange('url', event)}
      placeholder={'URL...'}
      value={this.state.literature.url}
    />
  }

  isLiteratureValid() {
    const {literature} = this.state;
    return literature.title != '' && literature.url != '';
  }

  addButton() {
    return <Button
      bsStyle="success"
      bsSize="small"
      onClick={() => this.handleLiteratureAdd()}
      style={{marginTop: 2}}
      disabled={!this.isLiteratureValid()}
      >
      <i className="fa fa-plus"></i>
    </Button>
  }

  render() {
    return <Row>
      <Col md={4} style={{paddingRight: 0}}>
        {this.titleInput()}
      </Col>
      <Col md={7} style={{paddingRight: 0}}>
        {this.urlInput()}
      </Col>
      <Col md={1}>
        {this.addButton()}
      </Col>
    </Row>
  }

}
