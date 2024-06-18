import { ButtonGroup } from '@material-ui/core';
import React, { Component , useState} from 'react';
import { Button, ButtonToolbar, FormControl, Glyphicon, Modal, Table, Popover,Tooltip,OverlayTrigger,Overlay, Panel, Alert,Col, Row} from 'react-bootstrap';
import { NIL } from 'uuid';



export default class CurationModal extends Component {

    constructor(props) {
      super(props);
      const { reaction } = props;
      this.addDictionaryButton = React.createRef()
      this.handleShow = this.handleShow.bind(this);
      this.handleClose = this.handleClose.bind(this);
      this.handleSuggest = this.handleSuggest.bind(this);
      this.handleSuggest = this.handleSuggest.bind(this);
      this.change_corect_word = this.change_corect_word.bind(this)
      this.handleChange = this.handleChange.bind(this)
      this.handleSuggestChange = this.handleSuggestChange.bind(this)
      this.handleDictionaryLang = this.handleDictionaryLang.bind(this)
      this.handlePromptDismiss = this.handlePromptDismiss.bind(this);
      this.handlePromptShow = this.handlePromptShow.bind(this);
      this.state = {
        desc : this.clean_data(this.props.description),
        show : false, 
        reaction : reaction,
        mispelled_words : [],
        suggestion : [],
        suggestion_index : 0,
        correct_word : "",
        subscript_list : [],
        dictionary_language: "US",
        show_prompt : false,
        
      }
      
    }

    handlePromptDismiss() {
      this.setState({ show_prompt: false });
    }
  
    handlePromptShow() {
      this.setState({ show_prompt: true });
    }

    handleDictionaryLang(){
      (this.state.dictionary_language === "US")
      ? this.setState({dictionary_language: "UK"})
      : this.setState({dictionary_language: "US"})
    }


    handleSuggestChange(e){
      const new_word = e.target.value
      this.setState({correct_word:new_word})
    }

    advance_suggestion(input,miss_spelled_words){
      if (input < miss_spelled_words.length ){
      input = input +1 }
      else {
        input = 0
      }
      this.handleSuggest(miss_spelled_words, input)
      this.setState( {suggestion_index : input} ) 
    }


    reverse_suggestion(input,miss_spelled_words){
      if (input < miss_spelled_words.length-1){
      input = input -1 }
      else {
        input = 0
      }
      this.handleSuggest(miss_spelled_words, input)
      this.setState( {suggestion_index : input} ) 
    }


    handleChange(){
      this.props.acOnChange(this.state.desc)
    }

    handleClose() {
      this.setState({ show: false });
    }
  
    handleShow() {
      this.setState({ show: true });
      this.spell_check(this.state.desc)
    }

    handleSuggest(miss_spelled_words, index){
      var Typo = require("typo-js");
      var dictionary = new Typo( "en_US", false, false, { dictionaryPath: "/typojs" });
      var mispelled_word = miss_spelled_words[index]
      if (typeof mispelled_word === "string" )
      {
        // the slow down is here, removing chemical names speeds it up, i believe this is an issue because no suggestions come up for the word
        var ms_suggestion = dictionary.suggest(mispelled_word)
        this.setState({ suggestion : ms_suggestion}) 
      }   
        
      else {
        console.log("run spell check")
      }
    }

    use_all_dicitonary(en_dictionary,custom_dictionary, word){
      var Typo = require("typo-js");
      var is_word_correct = false ;
      if (en_dictionary.check(word)){
        is_word_correct = true}
      else { if(custom_dictionary.check(word)){
        is_word_correct = true
      }}
      return is_word_correct
    }

    check_sub_script(input_text){
      if(/\b[a-z]\w*\d[a-z]*/gi.test(input_text)){
      var potential_mol_form = input_text.match(/\b[a-z]\w*\d[a-z]*/gi)
      var split_form = potential_mol_form[0].split(/(\d)/g) 
        // Clean off empty strings
        split_form = split_form.filter(n => n) 
        return split_form.map((part, index) => (
          <React.Fragment key={index}>
            {(split_form[index].match(/\d/))
              ? (<sub>{part}</sub>) 
              : (part)}
          </React.Fragment>
        )) 
    }}


    spell_check(description){
      if(description !== undefined)
{      var Typo = require("typo-js");
      var us_dictionary = new Typo("en_US", false, false, { dictionaryPath: "/typojs" });
      var cus_dictionary = new Typo("custom", false, false, { dictionaryPath: "/typojs" });
      var uk_dictionary = new Typo("en_UK", false, false, { dictionaryPath: "/typojs" })
      var ms_words = [];
      var ss_list = []
      var word_array = description.split(' ')

      if (this.state.dictionary_language === "UK"){
        var en_dictionary = uk_dictionary
        console.log("uk used")
      }
      else {
        var en_dictionary = us_dictionary
        console.log("us used")
      }

      for (let i = 0; i < word_array.length; i++){
        var punctuation = /[\.\,\?\!\(\) \"\-]/g;
        var double_space_regex= /\s\s/g
        word_array[i] = word_array[i].replace(punctuation, "");
        word_array[i] = word_array[i].replace(double_space_regex, " ")
        // check if word has a number in it
        if (/\b[\p{Script=Latin}]+\b/giu.test(word_array[i])){
          if(word_array[i].includes("°") ){
            var spell_checked_word = true
          }
          else
            {var spell_checked_word = this.use_all_dicitonary(en_dictionary,cus_dictionary,word_array[i]);
            console.log(word_array[i])

          }
        }
        else
          {if(/\b[a-z]\w*\d[a-z]*/gi.test(word_array[i]))
            {
              ss_list.push(word_array[i])
              console.log("sub found: "+ word_array[i])
            }
          else{
            var spell_checked_word = true; console.log("num found: "+ word_array[i])
              }
          } 
        if (spell_checked_word == false){
          ms_words.push(word_array[i]);
        } 
      }
      this.setState({mispelled_words: ms_words, subscript_list:ss_list})
      this.handleSuggest(ms_words, 0)
    }
  else{}}

    clean_misspelled_array(input_array){
      const counts = {};
      input_array.forEach(function (x) { counts[x] = (counts[x] || 0) + 1; });
      console.log(counts.values)
      return counts
    }


    change_misspelling(description,selected_choice,ms_words,index){
      if (selected_choice !== ""){
      var fixed_description = description.replace(ms_words[index], selected_choice);}
      else{
      var fixed_description = description}
      if (index < ms_words.length){
        index= index +1 }
      else {
          index = 0
        }
      this.setState({suggestion_index : index,desc :fixed_description});
      this.handleSuggest(ms_words, index);
      this.setState({correct_word: ""})
    }
    
    getHighlightedText(text, mispelled_words,ms_index,subscript_list) {
      // this.clean_misspelled_array(mispelled_words)
      if(text !== undefined){
      var combined_array = mispelled_words.concat(subscript_list)
      var highlight = combined_array.join("|")
      var parts = text.split(new RegExp(`(${highlight})`, "gi"));
      var output_div
      var list_items = parts.map((part, index) => (
        <React.Fragment key={index}>
          {(()=> {
            var miss_spelled_words_wo_current_word = mispelled_words.toSpliced(ms_index, 1)

            if(subscript_list.includes(part)){
              output_div =  this.check_sub_script(part)   
            }
            else if(part === mispelled_words[ms_index])
              {output_div = (<b style={{backgroundColor:"#32a852"}}>{part}</b>) 
              }
            else if(miss_spelled_words_wo_current_word.includes(part)) 
              {output_div = (<b style={{backgroundColor:"#e8bb49"}}>{part}</b>)
              }
            })()
          }
          {combined_array.includes(part)
            ? (output_div)
            : (part)} 
            
        </React.Fragment>))
        return (
          <div>
            {list_items}
          </div>
        );}}

    uniq(a) {
      var prims = {"boolean":{}, "number":{}, "string":{}}, objs = [];
      return a.filter(function(item) {
          var type = typeof item;
          if(type in prims)
              return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
          else
              return objs.indexOf(item) >= 0 ? false : objs.push(item);
      });
    }

    change_corect_word(changeEvent) {
      this.setState({correct_word: changeEvent.target.value}) 
    }


    clean_data(description){
      if (description !== undefined){
        const array_input = Object.values(description);
        let array_output =[];
        array_input.forEach((element) => {
            array_output = array_output.concat(element.insert);
        });
        const str_out = (array_output.join(""));
        return str_out;}
    }

    render() {

      const CustomPopover = () => {
        return (
          <div 
            style={{
              backgroundColor: '#EEE',
              boxShadow: '0 5px 10px rgba(0, 0, 0, 0.2)',
              border: '1px solid #CCC',
              borderRadius: 3,
                // marginBottom: 185,
              padding: 15
            }}
            >
                <div className='float' style={{padding: 5}}>
                  {this.state.correct_word} added To dictionary </div>
                  <ButtonToolbar>
                    <Button onClick={()=> {fetch("http://localhost:3000/api/v1/dictionary/remove?old_word=".concat(this.state.mispelled_words[this.state.suggestion_index])) ;this.handlePromptDismiss()}}>Remove last entry</Button>
                    <Button onClick={()=>{this.change_misspelling(this.state.desc, this.state.correct_word, this.state.mispelled_words, this.state.suggestion_index);this.handlePromptDismiss()}}>Next</Button>
                  </ButtonToolbar>
          </div>
          );
        }
    

      const Compo = ({ text, mispelled_words,index ,subscript_list}) => {
        
        return <p>{this.getHighlightedText(text, mispelled_words,index, subscript_list )}</p>;
      };

      const SuggestBox = ({suggest_array, suggestion_index}) =>{
        if (suggestion_index <  suggest_array.length ){
          return suggest_array.map((suggestion,id) =>  (
            <div key={id}>
              <label>
                <input type="radio" value= {suggestion} onChange={this.change_corect_word} checked={this.state.correct_word === suggestion}/>
                  {suggestion}
                </label> 
        {/* {suggest_array.length} : {suggestion_index} */}
             </div>  
        ));}
        else if (suggestion_index >= suggest_array.length ){
          // this.spell_check(this.state.desc)
        return(
        <div>
          <h5>SpellCheck Finished</h5>
        </div>)}
        else{
          return (
            <div>
              <h5>None</h5>
            </div>
          )
        }
      };

      const DictionaryButton = ({state})=>{
        if (state == true){
          return(<CustomPopover/>)
        }
        else{
          return(
            <Button 
            bsStyle="success" 
            onClick= {() => { 
            fetch("http://localhost:3000/api/v1/dictionary/amend?new_word=".concat(this.state.correct_word)); this.handlePromptShow()
         // this.change_misspelling(this.state.desc, this.state.correct_word, this.state.mispelled_words, this.state.suggestion_index);
            }}>
                add to dictionary {state}
            </Button>
          )
        }
      }

      return (
        <div>
          <Button  onClick={this.handleShow}>
            <span  title="Curate Data" className="glyphicon glyphicon-check" style={{color: "#369b1e"}}/>
          </Button>
    
          <Modal show={this.state.show} onHide={this.handleClose} >
            <Modal.Header closeButton>
              <Modal.Title>
                <Col md={6}>Spell Check: English {this.state.dictionary_language}   <Button onClick={()=> this.handleDictionaryLang()}><i class="fa fa-language" ></i></Button></Col>
                {/* <Col mdOffset={7}> Selected Language: {this.state.dictionary_language} </Col>  */}
                </Modal.Title> 
            </Modal.Header>
            <Modal.Body>
              <Panel>
                <Panel.Heading>
                  {/* <ButtonToolbar> */}
                 
                  <Row> <Button onClick={()=> {fetch("http://localhost:3000/api/v1/dictionary/amend?new_word=".concat(this.state.mispelled_words[this.state.suggestion_index]));this.advance_suggestion(this.state.suggestion_index,this.state.mispelled_words)}}>Add selected misspelled words</Button></Row>
                <Row style={{padding: 5}}>
                  {/* <Col md={4}> Or enter a new word:</Col> */}
                  <Col md={3} > <input onChange={this.handleSuggestChange}/></Col>
                  <Col md={3} >
                    <DictionaryButton state={this.state.show_prompt}></DictionaryButton>
                  </Col>
                </Row>
                </Panel.Heading>
                <Panel.Body>
                  <Compo text={this.state.desc} mispelled_words={this.state.mispelled_words} index={this.state.suggestion_index} subscript_list={this.state.subscript_list} /> 
                </Panel.Body> 
                <Panel>
                  <Panel.Heading>
                    <h4> Suggestions for : {this.state.mispelled_words[this.state.suggestion_index]}
                    </h4>
                  </Panel.Heading>
                  <Panel.Body>
                    <Col md={6}>
                      <SuggestBox suggest_array={this.state.suggestion} suggestion_index={this.state.suggestion_index}></SuggestBox>
                    </Col>
                    <Col md={6}>
                      
                    </Col>
                  </Panel.Body>
              <Panel.Footer><ButtonToolbar>
                <Button onClick={()=>this.advance_suggestion(this.state.suggestion_index,this.state.mispelled_words)}>Ignore</Button>
                <Button onClick={()=>this.reverse_suggestion(this.state.suggestion_index,this.state.mispelled_words)}>Go Back</Button>
                <Button onClick={()=>this.change_misspelling(this.state.desc, this.state.correct_word, this.state.mispelled_words, this.state.suggestion_index)}>Correct</Button>
                <div className='pull-right'><Button onClick={()=> {this.handleChange(); this.handleClose()}}> <i class="fa fa-floppy-o"></i> </Button></div>
              </ButtonToolbar> 
             
              </Panel.Footer>
            </Panel>
        </Panel>
    </Modal.Body>
  </Modal>
</div>
      );
    }
  }
