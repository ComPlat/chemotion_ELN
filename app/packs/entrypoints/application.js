// see https://github.com/rackt/react-router/issues/1067

var React = require('react');
var Home = require('src/apps/home');
var CnC = require('src/apps/commandAndControl');
var AdminHome = require('src/apps/admin');
var ChemScanner = require('src/apps/chemscanner/');
var ChemSpectra = require('src/apps/chemspectra/ChemSpectra');
var ChemSpectraEditor = require('src/apps/chemspectra/ChemSpectraEditor');
var MoleculeModerator = require('src/apps/moleculeModerator');
var OmniauthCredential = require('src/apps/omniauthCredential');
var UserCounter = require('src/apps/userCounter');
var ScifinderCredential = require('src/apps/scifinderCredential');
var StructureEditorUserSetting = require('src/components/structureEditor/UserSetting');
var mydb = require('src/apps/mydb');
