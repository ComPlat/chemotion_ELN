
# Chemotion_ELN Changelog


## [vMAJOR.MINOR.PATCH]
> yyyy-mm-dd


## [v1.1.0]
> 2022-01-18

* NB:
  * Admin: if applicable, chemspectra backend should be updated to version 0.10.13
  * Developers: reactjs updated to 17

* Features and Improvements:
  * export sample: literature option for excel list https://github.com/ComPlat/chemotion_ELN/issues/554
  * report: Add literature section in standard sample report  https://github.com/ComPlat/chemotion_ELN/issues/554
  * report: Add more information to standard reaction report https://github.com/ComPlat/chemotion_ELN/issues/523
  * attachments-inbox: filename matching  with sample’s “name” or “external name”. https://github.com/ComPlat/chemotion_ELN/issues/537
  * attachments-inbox: case-insensitive matching https://github.com/ComPlat/chemotion_ELN/issues/537
  * attachments-inbox: added labels “product” or “start material” if applicable https://github.com/ComPlat/chemotion_ELN/issues/537
  * attachments-inbox: when the assignment is completed, send a notification to user’s message box https://github.com/ComPlat/chemotion_ELN/issues/537
  * attachments-inbox: filename matching to support files from ELA system.
  * chemspectra: UV-vis layout extension  (part of https://github.com/ComPlat/chemotion_ELN/issues/531 )
  * chemspectra: Add further functions to XRD layout https://github.com/ComPlat/chemotion_ELN/issues/532
  * wellplate designer: select info and colour to be displayed in well (https://github.com/ComPlat/chemotion_ELN/issues/556, https://github.com/ComPlat/chemotion_ELN/issues/558)
  * wellplate designer: print wellplate as pdf (https://github.com/ComPlat/chemotion_ELN/issues/555)
  * name_abbreviation regexp validation is configurable
  * swagger documentation: visibility of endpoints doc customizable
  * rename tab 'literature' to 'references'. Please update the current profile_default.yml with the new one.
  * Admin user management: add multiple users from file.

* Fixes
  * import collection failed due to some molecules cannot be created successfully [cannot create molecule with given molfile](https://git.scc.kit.edu/ComPlat/chemotion_ELN/-/issues/1351)
  * filtering product samples of reactions when filter is on on sample list
  * https://github.com/ComPlat/chemotion_ELN/issues/584
  * Notification channels: correct wrong data format


## [v1.0.3]
> 2021-10-21: https://github.com/ComPlat/chemotion_ELN/releases/tag/v1.0.3

* Fixes
  * reseach-plan .docx export: convert SVG to PNG sample/reaction images
  * collection import with sample missing molecule_name: use default value
  * structure editors: added public/editors to ease set up
  * node post-install fx to resolve node_modules path when located outside of app (docker)
   


## [v1.0.2]
> 2021-10-19: https://github.com/ComPlat/chemotion_ELN/releases/tag/v1.0.2

* Fixes
  * DB migration: fix typo that could prevent updating from 0.9.1
  * structure editor: chemdrawjs-20 support
  * gate transfer: attachment checksum bckwrd compatibility


## [v1.0.1]
> 2021-10-11: https://github.com/ComPlat/chemotion_ELN/releases/tag/v1.0.1

* Improvements
  * LCSS display info only from ECHA source
  * QuillEditor: added special characters menu for ResearchPlan

* Fixes
  * postinstall rewrite of some imports in citation.js to fix wbpk assets compilation
  * Reaction SVG refresh  after editing or adding samples
  * Fix Cron Jobs for LCSS and Pubchem Info
  * dev: fix reaction seeds


## [v1.0.0]
> 2021-09-22: https://github.com/ComPlat/chemotion_ELN/releases/tag/v1.0.0

* Improvements
  * Resize private note field and remove save button [Private note rework #534](https://github.com/ComPlat/chemotion_ELN/issues/534)
  * Add hover over information to generic elements' symbols [add hover over information to generic elements' symbols #524](https://github.com/ComPlat/chemotion_ELN/issues/524)
  * Structure editor configuration [documentation](https://www.chemotion.net/chemotionsaurus/docs/eln/settings#structure-editor)

* Fixes
  * Adapt install_development.sh to Rails 5 environment [adapt install_development.sh to Rails 5 environment #530](https://github.com/ComPlat/chemotion_ELN/pull/530)
  * Tab headers in navigation items are italic [Tab headers in navigation items are italic #500](https://github.com/ComPlat/chemotion_ELN/issues/500)
  * Reaction svg shrinking or dedoubling
  * Reaction svg size become smaller and the svg is overlapping
  * Prevent hidden cell from being added to visible layout in tabslayout
  * QC curation tab is not working


## [v1.0.0-beta]
> 2021-08-26

* Updates
  * upd to rails from 4.2 to 5.2
  * now using yarn instead of npm, and webpack instead of browserify

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
> 2021-06-04: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.9.1

* Fixes
  * sync/share deletion permission
  * Admin: segment deletion


## [v0.9.0]
> 2021-05-26: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.9.0

* Features
  * Decoupled sample: molfile-less sample creation
  * Generic-element/segment (Beta): customizable data structure

* Fixes
  * serialization of sdf-imported molecules with improper file encoding


## [v0.8.0]
> 2021-04-28: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.8.0

* Features
  * option to decouple sample from molfile defined molecule - enable user custom MW input (Admin has to enable the feature)
  * research-plan table: switch to using ag-grid - enable moving  row/columns with d-n-d
  * nmr_sim ELN plugin installed by default

* Fixes
  * Add configurable default profile for Element-Detail tab sortings
  * slow opening of reaction panel: rm debounce
  * green-chemistry: fix checkbox rerendering in table cell
  * Analytics atom count scenari
  * default favicon if none present


## [v0.7.1]
> 2021-03-26: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.7.1

* Features
  * sorting of tabs in Element-detail Panel (Sample, Reaction,...)

* Fixes
  * mimemagic gem updated due to previous version forced retirement
  * research-plan table: cell focus input
  * slow opening of reaction panel: rm debounce


## [v0.7.0]
> 2021-03-15: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.7.0


## [v0.6.0]
> 2019-12-16: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.6.0

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
> yyyy-mm-dd

* Features
  * Element list: added time range filter / product filter
  * enhanced data collector, new configuration (Breaking change)
  * Export reactions as reaction smiles
  * Extract RSMI from docx embedded cdx object

* Fixes
  * Report formating
  * shared collection from deleted account


## [v0.3.dev]
> yyyy-mm-dd

* Features
  * upg Rails to 4.2.10 nvm to 6.10.2

* Fixes
  * Docker: node_modules as volume
  * collection_tag update after element re-assignmnet to former collection


## [v0.3.0]
> 2017-11-15: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.3.0

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

* Fixes
  * search result element ordering
  * dependent destroy of collections-elements
  * sample density default set to 0
  * react production build


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
> 2016-10-17: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.2.0

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


## [v0.1.0]
> 2016-05-31: https://github.com/ComPlat/chemotion_ELN/releases/tag/v0.1.0

* Features
  * ELN for (organic) chemistry
