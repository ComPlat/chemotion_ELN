
# Chemotion_ELN Changelog


## [v1.6.0] 
> 2023-05-09

* Features and Improvements:
  * Shibboleth authentication [#1239](https://github.com/ComPlat/chemotion_ELN/pull/1239). [See docs](https://chemotion.net/docs/eln/install_configure/configuration#user-authentication)
  * Chemspectra: UI for Cyclic Voltametry and CDS layouts [#1272](https://github.com/ComPlat/chemotion_ELN/pull/1273). [See docs](https://chemotion.net/docs/services/chemspectra)

* Fixes
  * port fixes from v1.5.3 v1.5.4
 
## [v1.5.4]
> 2023-05-09
* Admin: it is possible to reprocess SVGs images of molecules and samples ([see docs](https://chemotion.net/docs/eln/troubleshooting#fixing-sample-or-molecule-svg-images))

* Fixes
  * datacollector: find user by insensitive case name_abbreviation [#1302](https://github.com/ComPlat/chemotion_ELN/pull/1302)
  * eln to work with onlyoffice 7 [#1278](https://github.com/ComPlat/chemotion_ELN/pull/1278)
  * correct url building for inbox item notification [#1299](https://github.com/ComPlat/chemotion_ELN/pull/1299)
  * Cas datamodel change [#1287](https://github.com/ComPlat/chemotion_ELN/pull/1287)
  * Migration fixes [#1307](https://github.com/ComPlat/chemotion_ELN/pull/1307)
  * reactants from reagent list do not appear above reaction arrow [#1308](https://github.com/ComPlat/chemotion_ELN/pull/1308)
  * Search api: fix ActiveRecord::UnknownAttributeReference on sum-formulae [#1310](https://github.com/ComPlat/chemotion_ELN/pull/1310)
 

## [v1.5.3]
> 2023-04-21

* Fixes
  * analyses-dataset issue [#1271]( https://github.com/ComPlat/chemotion_ELN/pull/1271)
  * missing index in container entity [#1277](https://github.com/ComPlat/chemotion_ELN/pull/1277)
  * Report of samples with reaction description: fix calling of descripti..[1281](https://github.com/ComPlat/chemotion_ELN/pull/1281)
  * fix crash when open and save nmrium [#1275](https://github.com/ComPlat/chemotion_ELN/pull/1275)
  * Mail-collector: write tmp file to pass path [#1284](https://github.com/ComPlat/chemotion_ELN/pull/1284)
  * New purification method of Precipitation [#1290](https://github.com/ComPlat/chemotion_ELN/pull/1290)
  * 1285 do no cache the welcome message [#1286](https://github.com/ComPlat/chemotion_ELN/pull/1286)
  * 1289 saving wellplate causes white screen [#1295](https://github.com/ComPlat/chemotion_ELN/pull/1295)
  * Chemdraw JS doesn't work on Google Chrome 111.05563.x [#1266](https://github.com/ComPlat/chemotion_ELN/pull/1266)
  * show results from calculations [#1291](https://github.com/ComPlat/chemotion_ELN/pull/1291)
  * report issue fix [#1296](https://github.com/ComPlat/chemotion_ELN/pull/1296)

## [v1.6.0-rc1] 
> 2023-04-11

* Fixes
  * port fixes from v1.5.2 
  
## [v1.5.2]
> 2023-04-11

* Fixes
  * AttachmentAPI: quote filename in content-dispostion header [#1250](https://github.com/ComPlat/chemotion_ELN/pull/1250)
  * spectra: fix cannot sync 1d data [#1227](https://github.com/ComPlat/chemotion_ELN/pull/1227)
  * Ease shrine derivative access [#1255](https://github.com/ComPlat/chemotion_ELN/pull/1255)
  * update chem-spectra-app to version 0.11.2 [#1263](https://github.com/ComPlat/chemotion_ELN/pull/1263)
  * Literature entity to return reference data and doi [#1257](https://github.com/ComPlat/chemotion_ELN/pull/1257)
  * 1260 report UI to not break if a report template cannot be found [#1261](https://github.com/ComPlat/chemotion_ELN/pull/1261)
  * Fix the creation of sample with invalid label 'NEW SAMPLE' [#1240](https://github.com/ComPlat/chemotion_ELN/pull/1240)
  * Use db-generated uuid for building the attachment shrine id [#1259](https://github.com/ComPlat/chemotion_ELN/pull/1259)


## [v1.6.0-rc0]
> 2023-03-28

* Features and Improvements:
  * Shibboleth authentication [#1239](https://github.com/ComPlat/chemotion_ELN/pull/1239)

* Fixes
  * content-disposition header preventing fetching image properly [#1250](https://github.com/ComPlat/chemotion_ELN/pull/1250)


## [v1.5.1]
> 2023-03-24

* Fixes
  * omniauth provider entity fix [#1217](https://github.com/ComPlat/chemotion_ELN/pull/1217)
  * PDF attachments in Analyses Tab now readable [#1197](https://github.com/ComPlat/chemotion_ELN/pull/1197)
  * reset melting & boiling point for products on reaction copy [#1221](https://github.com/ComPlat/chemotion_ELN/pull/1221)
  * Minor image annotation fixes [#1223](https://github.com/ComPlat/chemotion_ELN/pull/1223)
  * cannot save 2D data [#1178](https://github.com/ComPlat/chemotion_ELN/pull/1178)
  * tab layout popups [#1212](https://github.com/ComPlat/chemotion_ELN/pull/1212)
  * cannot work with Bruker FID [#1232](https://github.com/ComPlat/chemotion_ELN/pull/1232)
  * Update sample task api for changes in Chemobile App [#1216](https://github.com/ComPlat/chemotion_ELN/pull/1216)
  *  white screen on the homepage after login [#1231](https://github.com/ComPlat/chemotion_ELN/pull/1231)
  * Set default search type value (EXACT) [#1224](https://github.com/ComPlat/chemotion_ELN/pull/1224)
  * Updated welcome message to point to new docs URL [#1236](https://github.com/ComPlat/chemotion_ELN/pull/1236)
  * export wellplate samples error fix by [#1235](https://github.com/ComPlat/chemotion_ELN/pull/1235)


## [v1.5.0]
> 2023-03-14

* Important for admin and developers:
  * Gem Shrine is now used to handle attachment files:
    - if you use a custom config/storage.yml file, ensure your shrine config/shrine.yml is correct or DB migrations will fail
  * Upgrade Rails to 6.1

* Features and Improvements:
  * Image Annotation tool ([docs](https://chemotion.net/docs/eln/ui/images))
  * collection archiving to RADAR (RADAR account needed)
  * NMRium: NMR data can be processed in [NMRium](https://www.nmrium.org/) ([docs](https://chemotion.net/docs/chemspectra/nmr?_highlight=nmrium#analysis-using-nmrium))
  * Integration of Chem-converter v0.9.0 ([docs]( https://chemotion.net/docs/chemconverter/)
  * Wellplate/Screen/ResearchPlan Workflow
  * Chemspectra: better UI for Cyclic Volt. 
  * add cas to sample export 
  * 

* Fixes
  * Chemspectra: The issue of multiplicities on chemspectra frontend are not removed when changing between layouts with the old JCAMP design is fixed
  * Chemspectra: Spectra can be processed even when the molfile is invalid (https://github.com/ComPlat/chemotion_ELN/issues/951) (Warning: update chem-spectra-app service to 0.11.0)
  * Affiliation autocomplete (sign up page)
  * CAS not searchable (index search might need to be rebuilt)
  * molecule image cropped in chemspectra
  * [others](https://github.com/ComPlat/chemotion_ELN/issues?q=is%3Aissue+is%3Aclosed+closed%3A2022-11-10..2023-02-28+label%3Abug+) 



## [v1.4.1]
> 2022-11-09

* Features and Improvements:
  * Allow selection of default drawing editor on individual user level settings [Allow selection of default drawing editor on individual user level settings #632](https://github.com/ComPlat/chemotion_ELN/issues/632)
  * Use 'Search CAS' instead of 'CAS content' based on final feedback from CAS
  * Ketcher Service on HTTPS

* Fixes:
  * An incomplete SVG file is generated after sanitizing the SVG
  * chemspectra on Reaction and ResearchPlan analyses
  * chemspectra display of XRD data
  * DataCollector: deletion of folder
  * Incorrect application root url in Jobs
  * client handling of attachment hyperlinks
  * misleading tooltip in the user list  (Admin UI)
  * proper version of chemspectra app



## [v1.4.0]
> 2022-09-26

* Important for admin and developers:
  * change of environment variable: use PUBLIC_URL instead of HOST and SMTP_HOST
  * nodejs upd to 14.20.0
  * drop support for bionic

* Features and Improvements:
  * ketcherservice: server generation of sample svg
  * Reaction coefficient: improve yield calculation (https://github.com/ComPlat/chemotion_ELN/issues/544)
  * Metadata-converter: v0.6.0
  * Chemspectra: v0.10.15 (allow reprocessing, read Bruker processed files if present)
  * Inbox: delete multiple attachments at once (https://github.com/ComPlat/chemotion_ELN/issues/571)
  * research-plan: improve context-menu in tables


* Fixes:
  * SVG generation for sample and reaction: (https://github.com/ComPlat/chemotion_ELN/issues/846)
  * Sample amount metric
  * report svg composer: skip image if image file does not exist.
  * chemspectra: duplicate image generation




## [v1.3.1]
> 2022-07-07

* Features and Improvements:
  * Download of large dataset as background job to avoid timeout (https://github.com/ComPlat/chemotion_ELN/issues/785)

* Fixes:
  * Reaction title on research-plan (https://github.com/ComPlat/chemotion_ELN/issues/787)
  * Well-details scrolling (https://github.com/ComPlat/chemotion_ELN/issues/669)


## [v1.3.0]
> 2022-07-05

* Features and Improvements:
  * dataset selection in chemspectra viewer [dataset selection in chemspectra viewer #715](https://github.com/ComPlat/chemotion_ELN/issues/715)
  * Screens:
    * Research Plans may be added to Screens
    * Associated Research Plans may be edited from Screens
  * Research Plans:
    * Wellplates may be added to Research Plans
  * Wellplates:
    * Add short label with user prefix and user's Wellplate count
    * Wells have multiple readouts now
    * Add title for readouts and display of multiple readouts in designer and list
    * Add attachments
    * Add import for well data from .xlsx and import template .xlsx
  * Collection Tag for research-plan screen (https://github.com/ComPlat/chemotion_ELN/pull/774)
  * Chemspectra : Cyclic Voltametry (Warning: upd chem-spectra-app service to 0.10.14)
  * ResearchPlan link to reactions and samples (https://github.com/ComPlat/chemotion_ELN/issues/666)
  * No reaction-svg when no material present (https://github.com/ComPlat/chemotion_ELN/issues/691)


* Fixes
  * report: fix the label can't be assigned issue https://github.com/ComPlat/chemotion_ELN/issues/661
  * Reference Style improvement [Reference Style improvement #695](https://github.com/ComPlat/chemotion_ELN/issues/695)
  * Adjust docker setup to work on mac
  * prevent unecessary building of reaction svg on description text input (https://github.com/ComPlat/chemotion_ELN/issues/759)
  * elemental composition value with 2 decimals (https://github.com/ComPlat/chemotion_ELN/issues/739)
  * reference Manager issues (https://github.com/ComPlat/chemotion_ELN/issues/708 https://github.com/ComPlat/chemotion_ELN/issues/756 )
  * Missing attachment preview in research plan (https://github.com/ComPlat/chemotion_ELN/issues/751)




## [v1.2.1]
> 2022-05-10

* Fixes
  * export dataset attachments with no hyperlink present
  * analysis: preview latest processed image
  * rails patch upd
  * npx audit fix


## [v1.2.0]
> 2022-04-14

* Features and Improvements:
  * fast input: sample creation
    - users can create samples by entering the CAS Registry Number or SMILES
  * SciFinder-n Search: integrate SciFinder-n into ELN and user can search in SciFinder for substances/reactions/references/suppliers by structure
  * analytics converter integration
  * OIDC signin


## [v1.1.4]
> 2022-04-14

* Fixes
  * Ketcher icons missing (since 1.1.3)


## [v1.1.3]
> 2022-04-05

* Fixes
  * npx-audit and Gem patches
  * migration
  * reaction prediction UI


## [v1.1.2]
> 2022-03-25

* Fixes
  * upd chemspectra client: XRD d-value
  * add product to reaction


## [v1.1.1]
> 2022-03-08

* Fixes
  * uniq sample short-label while creating reaction
  * customized toolbar refresh issue in quill editor
  * rendering of the group list when deleting multiple groups
  * permission to add elements to sync-collections


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
ton to element view
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
