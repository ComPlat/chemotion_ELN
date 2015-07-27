//= require_self
//= require react_ujs

React = require('react');
Test = require('./components/test');

// fetch example
fetch('/').then(function(response) {
    return response.text()
  }).then(function(body) {
    console.log(body)
  });

// Immutable example
const Immutable = require('immutable');
var map = Immutable.Map({foo: 'bar'});
console.log(map.get('foo'));

// alt initialization
const Alt = require('alt');
const alt = new Alt();
