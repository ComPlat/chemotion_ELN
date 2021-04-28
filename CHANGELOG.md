
# Chemotion_ELN Changelog

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
