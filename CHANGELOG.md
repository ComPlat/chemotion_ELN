
# Chemotion_ELN Changelog

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
