import React from 'react';
import {Input, Overlay, ListGroup, ListGroupItem} from 'react-bootstrap';
import debounce from 'es6-promise-debounce';

export default class AutoCompleteInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      valueBeforeFocus: null,
      showSuggestions: false,
      suggestions: null,
      suggestionFocus: null,
      error: '',
      inputWidth: 0
    };
  }

  componentDidMount() {
    this.initInputWidth();
  }

  initInputWidth() {
    let input = React.findDOMNode(this.refs.input);
    if(input) {
      this.setState({
        inputWidth: input.offsetWidth
      });
    }
  }

  getNextSuggestionIndex() {
    let {suggestions, suggestionFocus} = this.state;
    let result;
    let nextSuggestionIndex = suggestionFocus + 1;
    if(suggestions[nextSuggestionIndex]) {
      result = nextSuggestionIndex;
    } else {
      result = 0; // previous suggestion was first in list, so use last one
    }
    return result;
  }

  getPreviousSuggestionIndex() {
    let {suggestions, suggestionFocus} = this.state;
    let result;
    let previousSuggestionIndex = suggestionFocus - 1;
    if(suggestions[previousSuggestionIndex]) {
      result = previousSuggestionIndex;
    } else {
      result = suggestions.length - 1; // previous suggestion was first in list, so use last one
    }
    return result;
  }

  focusSuggestionUsingKeyboard(direction) {
    let suggestionFocus;
    if(direction == 'up') {
      suggestionFocus = this.getPreviousSuggestionIndex();
    } else if(direction == 'down') {
      suggestionFocus = this.getNextSuggestionIndex();
    }
    this.focusSuggestion(suggestionFocus);
    this.setState({suggestionFocus: suggestionFocus});
  }

  focusSuggestion(newFocus) {
    let {suggestions, suggestionFocus, value, valueBeforeFocus} = this.state;
    let newState = {};
    if(!valueBeforeFocus) {
      newState.valueBeforeFocus = value;
    }
    newState.value = suggestions[newFocus].name;
    newState.suggestionFocus = newFocus;
    React.findDOMNode(this.refs['suggestion_' + suggestionFocus]).classList.remove('active');
    React.findDOMNode(this.refs['suggestion_' + newFocus]).classList.add('active');
    this.setState(newState);
  }

  resetComponent() {
    this.setState({
      value: '',
      valueBeforeFocus: null,
      showSuggestions: false,
      suggestions: null,
      suggestionFocus: null,
      error: ''
    });
  }

  fetchSuggestions(value) {
    let debounced = debounce(this.props.suggestions, 200);
    debounced(value).then(result => {
      let newState = {};
      if(result.length > 0) {
        newState.suggestions = result;
        newState.suggestionFocus = result.length - 1;
        newState.showSuggestions = true;
      } else {
        newState.suggestions = null;
        newState.error = "Nothing was found.";
        newState.suggestionFocus = null;
        newState.showSuggestions = true;
      }
      this.setState(newState);
    }).catch(error => console.log(error));
  }

  handleValueChange(event) {
    let {value} = event.target;
    if(!value) {
      this.resetComponent();
    } else {
      this.setState({value: value});
      this.fetchSuggestions(value);
    }
  }

  handleKeyDown(event) {
    let {value, valueBeforeFocus, showSuggestions, error, suggestions} = this.state;
    let {onSelectionChange} = this.props;
    let newState = {};
    switch(event.keyCode) {
      case 13: // Enter
        this.selectSuggestion();
        event.preventDefault();
        break;
      case 27: // ESC
        this.abortAutoSelection();
        event.preventDefault();
        break;
      case 38: // Up
        if(showSuggestions && !error) {
          this.focusSuggestionUsingKeyboard('up');
        }
        event.preventDefault();
        break;
      case 40: // Down
        if(showSuggestions && !error) {
          this.focusSuggestionUsingKeyboard('down');
        } else if(suggestions) {
          newState.showSuggestions = true;
        }
        event.preventDefault();
        break;
    }
    this.setState(newState);
  }

  selectSuggestion() {
    let {suggestions, suggestionFocus} = this.state;
    let {onSelectionChange} = this.props;
    this.setState({
      showSuggestions: false,
      valueBeforeFocus: null
    });

    let selection = (this.state.value == suggestions[suggestionFocus].name)
      ? suggestions[suggestionFocus]
      : {name: this.state.value, search_by_method: 'substring'};

    onSelectionChange(selection);
  }

  abortAutoSelection() {
    let {valueBeforeFocus} = this.state;
    this.setState({
      showSuggestions: false,
      value: valueBeforeFocus,
      valueBeforeFocus: null,
      suggestionFocus: null
    });
  }

  renderSuggestions() {
    let {suggestions, error} = this.state;
    let types = {
      iupac_name: {icon: 'icon-sample', label: 'Molecule'},
      sample_name: {icon: 'icon-sample', label: 'Sample'},
      reaction_name: {icon: 'icon-reaction', label: 'Reaction'},
      wellplate_name: {icon: 'icon-wellplate', label: 'Wellplate'},
      screen_name: {icon: 'icon-screen', label: 'Screen'},
      requirements: {icon: 'icon-screen', label: 'Requirement'},
      conditions: {icon: 'icon-screen', label: 'Condition'},
    }
    if(suggestions) {
      return (
        <div>
          {suggestions.map((suggestion, index) => {
            let suggestionType = types[suggestion.search_by_method]
            return (
              <ListGroupItem
                onClick={() => this.selectSuggestion()}
                onMouseEnter={() => this.focusSuggestion(index)}
                key={'suggestion_' + index}
                ref={'suggestion_' + index}
              >
                <i className={suggestionType.icon} style={{marginRight: 2}}></i>
                {suggestion.name}
              </ListGroupItem>
            );
          })}
        </div>
      );
    } else if(error) {
      return <ListGroupItem>{error}</ListGroupItem>;
    } else {
      return (
        <div></div>
      );
    }
  }

  render() {
    let {value, showSuggestions, inputWidth} = this.state;
    let containerStyle = {
      position: 'absolute',
      width: inputWidth,
      marginTop: -15,
      marginLeft: 0,
      zIndex: 2
    };
    return (
      <div>
        <Input {...this.props.inputAttributes}
          type='text'
          value={value}
          autoComplete='off'
          ref='input'
          onChange={event => this.handleValueChange(event)}
          onKeyDown={event => this.handleKeyDown(event)}
          buttonBefore={this.props.buttonBefore}
        />
        <Overlay
          show={showSuggestions}
          onHide={() => this.abortAutoSelection()}
          placement='bottom'
          container={this}
          rootClose={true}>
          <div style={containerStyle}>
            <ListGroup {...this.props.suggestionsAttributes}>
              {this.renderSuggestions()}
            </ListGroup>
          </div>
        </Overlay>
      </div>
    );
  }
}
