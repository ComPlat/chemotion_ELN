
# Chemotion_ELN Changelog

## [v1.0.0-beta]
> 2021-08-26

* Update

  * upd to rails 5 - webpack

* New features and improvements

  * Private notes for samples
  * Generic elements/segments/datasets
    - Element details tab layout: segment tab to show if data present [Element details tab layout: segment tab to show if data present #506](https://github.com/ComPlat/chemotion_ELN/issues/506)
    - In user view, enable the sorting of lines of a table [generic elements, segments and analyses #480](https://github.com/ComPlat/chemotion_ELN/issues/480)
    - Add samples to generic element in table #461 [Add samples to generic element in table #461](https://github.com/ComPlat/chemotion_ELN/issues/461)
    - Generic element/segment units (Joule) [generic element/segment units (Joule) #457](https://github.com/ComPlat/chemotion_ELN/issues/457)
    - Administrator can export/import the generic template [generic template upload and download #444](https://github.com/ComPlat/chemotion_ELN/issues/444)
    - Revision control, track changes of the template and user inputs [generic revision feature #443](https://github.com/ComPlat/chemotion_ELN/issues/443)
    - Drag and drop sample/molecule to the table [ELN Adminstration/generic elements: Create a table for drag and drop Sample/Molecule #437](https://github.com/ComPlat/chemotion_ELN/issues/437)
    - new units for generic sections [new units for generic sections #436](https://github.com/ComPlat/chemotion_ELN/issues/436)
    - new units for generic sections [new units for generic sections #434](https://github.com/ComPlat/chemotion_ELN/issues/434)
    - Add new field type: Upload in generic element/segment #400 [Upload option in generic element/segment #400](https://github.com/ComPlat/chemotion_ELN/issues/400)
  * Send welcome email for new users [Customized welcome email to new user #483](https://github.com/ComPlat/chemotion_ELN/issues/483)
  * Instance customizable home page as MD file [Display customized welcome message at home page #470](https://github.com/ComPlat/chemotion_ELN/issues/470)
  * Decoupled sample
    - Remove name in scheme for decoupled sample [remove name in scheme for decoupled sample #465](https://github.com/ComPlat/chemotion_ELN/issues/465)
    - Add "undefined structure" as default value for decoupled samples [Add "undefined structure" as default value for decoupled samples #463](https://github.com/ComPlat/chemotion_ELN/issues/463)
    - Provide table function in generic element/segment [table function #414](https://github.com/ComPlat/chemotion_ELN/issues/414)
  * Revamp of analytics inbox
  * Report template management
  * Device metadata

* Fixes

  * rename chemotion.net to chemotion-repository.net in the Collection Bar [rename chemotion.net to chemotion-repository.net in the Collection Bar #515](https://github.com/ComPlat/chemotion_ELN/issues/515)
  * input field on ipad [Not all fields work normally with ipad #458](https://github.com/ComPlat/chemotion_ELN/issues/458)
  * The permission level "delete" in sharing collections doesn't work and the receiver can't delete [The permission level "delete" in sharing collections doesn't work and the receiver can't delete #425](https://github.com/ComPlat/chemotion_ELN/issues/425)
  * truncated reaction svg
  * upload of large files
  * reload of reports

## [v0.9.1]
> 2021-06-04

* Fix
  * sync/share deletion permission
  * Admin: segment deletion

## [v0.9.0]
> 2021-05-26

* Features
  * Decoupled sample: molfile-less sample creation
  * Generic-element/segment (Beta): customizable data structure

* Fix
  * serialization of sdf-imported molecules with improper file encoding


## [v0.8.0]
> 2021-04-28

* Features
  * option to decouple sample from molfile defined molecule - enable user custom MW input (Admin has to enable the feature)
  * research-plan table: switch to using ag-grid - enable moving  row/columns with d-n-d
  * nmr_sim ELN plugin installed by default

* Fix
  * Add configurable default profile for Element-Detail tab sortings
  * slow opening of reaction panel: rm debounce
  * green-chemistry: fix checkbox rerendering in table cell
  * Analytics atom count scenari
  * default favicon if none present


## [v0.7.1]
> 2021-03-26

* Features
  * sorting of tabs in Element-detail Panel (Sample, Reaction,...)

* Fix
  * mimemagic gem updated due to previous version forced retirement
  * research-plan table: cell focus input
  * slow opening of reaction panel: rm debounce


## [v0.7.0]
> 2021-03-15


## [v0.6.0]
> 2019-12-16

* Features
 * minor UX improvements
 * admin UI for data-collector and noVNC connection
 * improve report UI performance

## [v0.5.0]
> 2019-10-08

* Features
  * Analysis type according to Chemical Ontology (owl)
  * export data from whole collections as zip (and import them)
  * server notification system to users. E.g: user get notified when:
    - the report generation is done
    - it needs to refresh the browsers page to reload the cached application (update)
  * Admin UI:
    - NB: migrations will seed a default admin account => you need to change its password
      email: `eln-admin@kit.edu` , pw: `PleaseChangeYourPassword`
    - basic user management functions + direct notification to user
    - DataCollector device configuration
    - global notification to users
  * Green Chemistry calculator for reaction
  * RInChI integration
  * new reporting functions
  * sample/reaction large image preview from their element lists on hover
  * clone samples/reactions to one's Chemotion Repository account (chemotion.net)

* Upgrade Notes:
  * must do: change the default password of the default admin account (vide supra)
  * should do: reports are now stored as attachments run rake task
  `data:ver_20180812115719_add_colums_to_attachment` to ensure the retrievability of previously generated
  reports


## [v0.4.0]
* Features
  * Element list: added time range filter / product filter
  * enhanced data collector, new configuration (Breaking change)
  * Export reactions as reaction smiles
  * Extract RSMI from docx embedded cdx object
* Fixes
  * Report formating
  * shared collection from deleted account

## [v0.3.dev]
* Features
  * upg Rails to 4.2.10 nvm to 6.10.2
* Fixes
  * Docker: node_modules as volume
  * collection_tag update after element re-assignmnet to former collection

## [v0.3.0]
> 2017-11-15
* Features
  * Export reaction smiles
  * reporting: revamp of UI
  * reporting: analysis metadata formating
  * user affiliations management
  * revamp of sample/reaction detail UI
  * select the sample molecule_name to display
  * fetch CAS from pubchem
  * uuid (qr code) for each element (sample, reaction, analyse)
  * export samples as sdf
  * adv search
  * Docker install
  * ....
* Fixes
  * search result element ordering
  * dependent destroy of collections-elements
  * sample density default set to 0
  * react production build
  * ....

## [v0.2.1]
> 2016-11-02
* Features
  * Temperature Chart with unit converter (°C, °F , K) for reaction
  * Import molecules and create samples from a sd file
    (R group and polymer support are not supported)
  * Images in report doc are from eps files
  * rearrange the reaction list for a report by Drag-and-drop -ing
  * Text editing and formating tool bar for the reaction description
* Fixes
  * upgrade to Ruby 2.3.1
  * The Upload of analyses files does not fail if the thumbnail creation does

## [v0.2.0]

> 2016-10-17
* Features
  * sharing data with a group of users
  * substructure search with fingerprint algorithm
  * multiple solvents for reactions
  * drag-and-drop of sample to reaction solvent
  * user-defined chemical structure templates
  * common chemical structure templates
  * synchronized collections
  * added full-screeen button to element view
  * database and attachments backups
  * better import feature
  * advanced export options
  * generate reports in .doc format
  * different naming for reaction product
  * add concentration to sample in solution
  * updates in reporting system
  * molecular weight calculation in real time Ketcherails v0.1.1
  * molecular weight calculation for selected structure part in
    real time Ketcherails v0.1.1
  * warning for user when editing parent/child sample: parent/child samples
    structures are not automatically updated
  * reactants are not appearing in the samples list anymore
  * added more details to sample analyses header
  * style and user interface improvements
  * zooming of reactions SVGs
* Fixes
  * user created samples counter is not decremented on deletion
  * add material for reaction
  * do not show non-saved collection in collection tree
  * edit sample from reaction
  * better scaling of sample and reaction SVG images
  * multiple bug fixes
[v0.2.0]: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.2.0

## [v0.1.0]
> 2016-05-31
-**Features:** ELN for (organic) chemistry
[v0.1.0]: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.1.0
