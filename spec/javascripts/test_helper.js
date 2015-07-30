var path = require('path');
var jsPath = path.normalize(__dirname + '../../../app/assets/javascripts/components/');

componentPath = function (componentName) { return jsPath + componentName; };