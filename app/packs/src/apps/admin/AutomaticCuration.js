import React, { Component} from 'react';
import { Grid, Row, Col, Nav, NavItem , Button, Form, FormGroup,ControlLabel,FormControl,HelpBlock} from 'react-bootstrap';
import Dropzone from 'react-dropzone';


export default class DictionaryCuration extends Component  {
    constructor(props) {
        super(props);
        this.saveFile = this.saveFile.bind(this)
        this.handleChange = this.handleChange.bind(this);
        this.state = {
            value: '',
            file: null
        }}

    componentDidMount(){
        var dictionaryText = ""
        fetch("/typojs/custom/custom.dic")
        .then ((res)=> res.text())
        .then((text) => {
         dictionaryText = text;
         this.setState({value : dictionaryText}, () =>{
         });
        })
    }

    saveFile(){
        var new_dic = this.state.value
        new_dic = encodeURIComponent(new_dic)
        console.log(new_dic)
        fetch("http://localhost:3000/api/v1/dictionary/save?new_dic=" + new_dic)
    }

    handleChange(e) {
        this.setState({ value: e.target.value });
      }

    handleFileDrop(attach) {
        this.setState({ file: attach[0] });
      }
    
    handleAttachmentRemove() {
        this.setState({ file: null });
      }

    dropzoneOrfilePreview() {
        const { file } = this.state;
        return file ? (
          <div>
            {file.name}
            <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
              <i className="fa fa-trash-o" />
            </Button>
          </div>
        ) : (
          <Dropzone
            onDrop={attach => this.handleFileDrop(attach)}
            style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}>
            <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
              Drop File, or Click to Select.
            </div>
          </Dropzone>
        );
      }

    fileDisplay(){
        let dictionary_variable = "test"
        if (this.state.file === null){
            dictionary_variable = "this.state.file"}
        else(this.state.file.text()
        .then((text) => this.setState({value :text})))}
    
    render() {
        return(
        <div>
            <div>{this.fileDisplay()}</div>
            {this.dropzoneOrfilePreview()}
            <Button onClick={()=> this.saveFile()}>Save dictionary</Button>
                <FormGroup controlId="formBasicText">
                    <ControlLabel>Custom Dictionary</ControlLabel>
                    <FormControl
                        componentClass="textarea"
                        value={this.state.value}
                        onChange={this.handleChange}
                        style={{width: 800, height: 600}}
                    />
                    <FormControl.Feedback />
                </FormGroup>
            </div>
        )
    }   
}
