//= require_self
//= require react_ujs

React = require('react');
App = require('./components/App');

// Immutable example
const Immutable = require('immutable');
var map = Immutable.Map({foo: 'bar'});
console.log(map.get('foo'));
