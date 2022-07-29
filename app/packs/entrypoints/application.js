// see https://github.com/rackt/react-router/issues/1067

var React = require('react');
var Home = require('src/apps/home');
var CnC = require('src/apps/command_and_control');
var AdminHome = require('../src/admin/AdminHome');
var ChemScanner = require('src/apps/chemscanner/');
var ChemSpectra = require('src/apps/chemspectra/ChemSpectra');
var ChemSpectraEditor = require('src/apps/chemspectra/ChemSpectraEditor');
var MoleculeModerator = require('../src/components/MoleculeModerator');
var OmniauthCredential = require('../src/components/sso/OmniauthCredential');
var UserCounter = require('src/apps/user_counter');
var ScifinderCredential = require('src/apps/scifinder_credential');
var mydb = require('src/apps/mydb');
