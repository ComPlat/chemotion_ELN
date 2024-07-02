import React, { Component} from 'react';
import { Grid, Row, Col, Nav, NavItem , Button, Form, FormGroup,ControlLabel,FormControl,HelpBlock} from 'react-bootstrap';
import Dropzone from 'react-dropzone';


export default class DictionaryCuration extends Component  {
    constructor(props) {
        super(props);
        this.saveFile = this.saveFile.bind(this)
        this.handleChangeCustom = this.handleChangeCustom.bind(this);
        this.handleChangeEstablished = this.handleChangeEstablished.bind(this);
        this.handleChangeCustomSearch = this.handleChangeCustomSearch.bind(this)
        this.handleChangeEstablishedSearch = this.handleChangeEstablishedSearch.bind(this)
        this.state = {
            customValue: '',
            establishedValue:"",
            file: null,
            customSearch: "",
            establishedSearch :"",
            affixFile: ""
        }}

    componentDidMount(){
        var customDictionaryText = ""
        var establishedDictionaryText = ""
        var affixText =""
        fetch("/typojs/custom/custom.dic")
        .then ((res)=> res.text())
        .then((text) => {
         customDictionaryText = text;
         this.setState({customValue : customDictionaryText}, () =>{
         });
        })
        fetch("/typojs/en_US/en_US.dic")
        .then ((res)=> res.text())
        .then((text) => {
         establishedDictionaryText = text;
         this.setState({establishedValue : establishedDictionaryText}, () =>{
         });
        })
        fetch("/typojs/en_US/en_US.aff")
        .then ((res)=> res.text())
        .then((text) => {
         affixText = text;
         this.setState({affixFile : affixText}, () =>{
         });
        })
        
    }

    convertAffxStrtoObj(affixStr){
      var affixArray =affixStr.split("\n")
      var iArray = []
      var affixObject = {}
      for (var i =0 ; i < affixArray.length; i++){
        var affixLine = affixArray[i]
        if (affixLine.match(/((SFX)|(PFX)) [A-Z] ((Y)|(N)) \d/g)){
          iArray.push(i)
        }
      }
      for (var i =0 ; i < iArray.length; i++){
        var startingLine = (affixArray[iArray[i]])
        var numOfLines = startingLine.match(/\d/).join()
        var affixLetter= startingLine.match(/ [A-Z] /)
        var affixMap = new Map
        // affixObject[affixLetter] = {"num of lines": numOfLines}
        var endingLine = iArray[i] + parseInt(numOfLines)
          for (var j = iArray[i] +1; j <= endingLine; j++){
            var selectedLine = affixArray[j];
            var slicedLine = selectedLine.slice(14,selectedLine.length);
            var splitSlicedLine = slicedLine.split(" ");
            var filteredLine = splitSlicedLine.filter((x)=> x != "" );
            var affix = filteredLine[0]
            var lastChar = filteredLine[1]
            affixMap.set(lastChar, affix)
            affixObject[affixLetter] = [affixMap]
             }
             var sORp = (startingLine.match(/((SFX)|(PFX))/)[0])
             affixObject[affixLetter].push(sORp)
          }
      return affixObject
    }

    workWithaffObject (input, affixObject){
      
    }

    saveFile(){
      var new_dic = this.state.customValue
      new_dic = encodeURIComponent(new_dic)
      console.log(new_dic)
      fetch("http://localhost:3000/api/v1/dictionary/save?new_dic=" + new_dic)
    }

    handleChangeCustom(e) {
      this.setState({ customValue: e.target.value });
    }
    
    handleChangeEstablished(e) {
      this.setState({ establishedValue: e.target.value });
    }

    handleChangeCustomSearch(e) {
      this.setState({ customSearch: e.target.value });
    }

    handleChangeEstablishedSearch(e) {
      this.setState({ establishedSearch: e.target.value });
    }

    handleFileDrop(attach) {
        this.setState({ file: attach[0] });
    }
    
    handleAttachmentRemove() {
        this.setState({ file: null });
    }

    convertDictionaryToArray(custom,established){
      var customArray = custom.split("\n")
      var establishedArray = established.split("\n")
      for(let i = 0;i < establishedArray.length; i++) {
        var x = establishedArray[i].indexOf("/")
        establishedArray[i] = establishedArray[i].slice(0,x)
      }
      customArray = customArray.filter(val => !establishedArray.includes(val));
      this.setState({customValue: customArray.join("\n")})
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
            style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
            // accept ={".dic"}
            >
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
            {this.fileDisplay()}
            {this.dropzoneOrfilePreview()}
            <Button onClick={()=> this.convertDictionaryToArray(this.state.customValue,this.state.establishedValue)}>Check Custom Dictionary</Button>
            <Button onClick={()=> this.saveFile()}>Save dictionary</Button>
            <Button onClick={()=> this.convertAffxStrtoObj(this.state.affixFile)}>load affix</Button>
            <Row>
              <Col lg={6}>
                  <FormGroup controlId="customDictionary">
                      <ControlLabel>Custom Dictionary
                        <Row>
                          <Col lg={6}>
                            <FormControl
                              type="text"
                              placeholder="Enter Search"
                              onChange={this.handleChangeCustomSearch}/>
                          </Col>
                          <Col lg={5}> <Button>Submit</Button></Col>
                        </Row>
                      </ControlLabel>
                      <FormControl
                          componentClass="textarea"
                          value={this.state.customValue}
                          onChange={this.handleChangeCustom}
                          style={{width: 500, height: 600}}
                      />
                      <FormControl.Feedback />
                  </FormGroup>
                  </Col>
                  <Col lg={6}>
                  <FormGroup controlId="establishedDictionary">
                      <ControlLabel>Established Dictionary
                        <Row>
                          <Col lg={6}>
                            <FormControl
                              type="text"
                              // value={this.state.value}
                              placeholder="Enter Search"
                              onChange={this.handleChangeEstablishedSearch}/>
                          </Col>
                          <Col lg={5}> <Button>Submit</Button></Col>
                        </Row>
                        </ControlLabel>
                      <FormControl
                          componentClass="textarea"
                          value={this.state.establishedValue}
                          onChange={this.handleChangeEstablished}
                          style={{width: 500, height: 600}}
                      />
                      <FormControl.Feedback />
                  </FormGroup>
                  </Col>
                </Row>
            </div>
        )
    }   
}
