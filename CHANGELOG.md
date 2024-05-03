# Chemotion_ELN Changelog

## Latest
* Bug fixes


## [v1.9.2]
> (2024-04-26)

* Features and enhancements
  * LabIMotion 1.3.0 ([docs](https://github.com/LabIMotion/labimotion/blob/v1.3.0/CHANGELOG.md))([#1881](https://github.com/ComPlat/chemotion_ELN/pull/1881))
  * datacollector device config sftp port  ([#1885](https://github.com/ComPlat/chemotion_ELN/pull/1885))
  * admin can restore deleted user account  ([#1845](https://github.com/ComPlat/chemotion_ELN/pull/1845))
  * admin can delete single user account  ([#1883](https://github.com/ComPlat/chemotion_ELN/pull/1883)) 
  

* Bug fixes
  * lock screen spinner on select close and save function in chemspectra  ([#1879](https://github.com/ComPlat/chemotion_ELN/pull/1879))
  * instrument suggestion dropdown position in analyses metadata  ([#1887](https://github.com/ComPlat/chemotion_ELN/pull/1887))
  * LabIMotion 1.3.0 ([docs](https://github.com/LabIMotion/labimotion/blob/v1.3.0/CHANGELOG.md))([#1881](https://github.com/ComPlat/chemotion_ELN/pull/1881))

* Refactor
  *  gate transfer - streaming data transfer to Chemotion Rep…  ([#1882](https://github.com/ComPlat/chemotion_ELN/pull/1882))



## [v1.9.1]
> (2024-04-16)

* Bug fixes
  * analysis name issue  ([#1846](https://github.com/ComPlat/chemotion_ELN/pull/1846))
  * NMRium button disabled on 2D NMR  ([#1848](https://github.com/ComPlat/chemotion_ELN/pull/1848))
  * multiple API calls for empty deviceBox  ([#1867](https://github.com/ComPlat/chemotion_ELN/pull/1867))
  * add cell lines to structure search result  ([#1871](https://github.com/ComPlat/chemotion_ELN/pull/1871))
  * svg scrubber  ([#1876](https://github.com/ComPlat/chemotion_ELN/pull/1876))

  UX/UI
  * sample entry alignment and spacing  ([#1853](https://github.com/ComPlat/chemotion_ELN/pull/1853))
  * attachment list disappearing from Inbox-device when toggling sorting  ([#1869](https://github.com/ComPlat/chemotion_ELN/pull/1869))
  * attachment list  ([#1852](https://github.com/ComPlat/chemotion_ELN/pull/1852))

* Chores
  * change rinchi-gem to github  ([#1854](https://github.com/ComPlat/chemotion_ELN/pull/1854))
  * unpin `rubocop` gem  ([#1858](https://github.com/ComPlat/chemotion_ELN/pull/1858))
  * Bump tar from 6.1.11 to 6.2.1  ([#1859](https://github.com/ComPlat/chemotion_ELN/pull/1859))


## [v1.9.0]
> (2024-03-28)

* Features and enhancements

  UX/UI
  * Unified attachment list  ([#1608](https://github.com/ComPlat/chemotion_ELN/pull/1608))
  * Add column header menus to `ReactionVariations` table  ([#1804](https://github.com/ComPlat/chemotion_ELN/pull/1804))
  * extended search  ([#1194](https://github.com/ComPlat/chemotion_ELN/pull/1194))
  * add element cell line  ([#1582](https://github.com/ComPlat/chemotion_ELN/pull/1582))
  * converter download  ([#1688](https://github.com/ComPlat/chemotion_ELN/pull/1688))
  * analysis attachment groups  ([#1674](https://github.com/ComPlat/chemotion_ELN/pull/1674))
  * add sample inventory label counter  ([#1581](https://github.com/ComPlat/chemotion_ELN/pull/1581))
  * upgrade converter to v1.2.0  ([#1704](https://github.com/ComPlat/chemotion_ELN/pull/1704))
  * sort the device list by name in command_n_control  ([#1707](https://github.com/ComPlat/chemotion_ELN/pull/1707))
  * Add models VesselTemplate, Vessel, CollectionsVessel  ([#1548](https://github.com/ComPlat/chemotion_ELN/pull/1548))
  * analysis comment button and box for analysis tab  ([#1696](https://github.com/ComPlat/chemotion_ELN/pull/1696))
  * filter jdx files to be processed by converter-app  ([#1712](https://github.com/ComPlat/chemotion_ELN/pull/1712))
  * Inbox device folders named with the device full-name  ([#1709](https://github.com/ComPlat/chemotion_ELN/pull/1709))
  * add helpdesk link in header  ([#1713](https://github.com/ComPlat/chemotion_ELN/pull/1713))
  * data collector mechanism is modified to collect files/folders from user-level directories  ([#1728](https://github.com/ComPlat/chemotion_ELN/pull/1728))
  * allow import of sample external label on sample import  ([#1767](https://github.com/ComPlat/chemotion_ELN/pull/1767))
  * save button for chemical inventory in sample header  ([#1810](https://github.com/ComPlat/chemotion_ELN/pull/1810))
  * Copy research plan   ([#1667](https://github.com/ComPlat/chemotion_ELN/pull/1667))

  ChemSpectra and NMRIUM
  * enable nmrium in read only collection  ([#1708](https://github.com/ComPlat/chemotion_ELN/pull/1708))
  * label detector in SEC spectra  ([#1691](https://github.com/ComPlat/chemotion_ELN/pull/1691))
  * Table of data types and chemspectra layouts in the ELN Admin  ([#1574](https://github.com/ComPlat/chemotion_ELN/pull/1574))
  * update react-spectra-editor to display theoretical mass value  ([#1675](https://github.com/ComPlat/chemotion_ELN/pull/1675))
  * clear all peak btn - upd spectra editor to v1.2.0  ([#1730](https://github.com/ComPlat/chemotion_ELN/pull/1730))

* Bug fixes
  * remove original data in nmrium file  ([#1661](https://github.com/ComPlat/chemotion_ELN/pull/1661))
  * attached research_plans in screens not being imported from collection  ([#1671](https://github.com/ComPlat/chemotion_ELN/pull/1671))
  * remove duplicate user label and centering share button  ([#1682](https://github.com/ComPlat/chemotion_ELN/pull/1682))
  * temperature conversion  ([#1680](https://github.com/ComPlat/chemotion_ELN/pull/1680))
  * NMR zip upload   ([#1690](https://github.com/ComPlat/chemotion_ELN/pull/1690))
  * show `Tooltip` on "+" button in "Variations" tab  ([#1694](https://github.com/ComPlat/chemotion_ELN/pull/1694))
  * include reaction variations in `.docx` report  ([#1697](https://github.com/ComPlat/chemotion_ELN/pull/1697))
  * amount change of a reaction product from the sample properties tab  ([#1692](https://github.com/ComPlat/chemotion_ELN/pull/1692))
  * sample entry label alignment  ([#1693](https://github.com/ComPlat/chemotion_ELN/pull/1693))
  * data cannot be removed from segment of element  ([#1711](https://github.com/ComPlat/chemotion_ELN/pull/1711))
  * dfg logo resource in README.md  ([#1710](https://github.com/ComPlat/chemotion_ELN/pull/1710))
  * focus lost on input bug for melting & boiling points fields  ([#1716](https://github.com/ComPlat/chemotion_ELN/pull/1716))
  * nmrium button in research plan  ([#1715](https://github.com/ComPlat/chemotion_ELN/pull/1715))
  * export research plan as docx (#1718)  ([#1718](https://github.com/ComPlat/chemotion_ELN/pull/1718))
  * nmr prediction freezes  ([#1720](https://github.com/ComPlat/chemotion_ELN/pull/1720))
  * advanced search not working - cell-line  ([#1733](https://github.com/ComPlat/chemotion_ELN/pull/1733))
  * avoid loading the comments if the user does not have UI permission for comments  ([#1727](https://github.com/ComPlat/chemotion_ELN/pull/1727))
  * generic dataset general info for CV  ([#1762](https://github.com/ComPlat/chemotion_ELN/pull/1762))
  * Quill editor menu bar for admin text template  ([#1765](https://github.com/ComPlat/chemotion_ELN/pull/1765))
  * devcontainer  ([#1771](https://github.com/ComPlat/chemotion_ELN/pull/1771))
  * si spectra report generation for reaction with multiple products  ([#1777](https://github.com/ComPlat/chemotion_ELN/pull/1777))
  * thumbnail load issue in Preview page  ([#1754](https://github.com/ComPlat/chemotion_ELN/pull/1754))
  * Make `prepare-ruby-dev.sh` executable  ([#1784](https://github.com/ComPlat/chemotion_ELN/pull/1784))
  * display jcamp in nmrium  ([#1789](https://github.com/ComPlat/chemotion_ELN/pull/1789))
  * save correct combined image  ([#1772](https://github.com/ComPlat/chemotion_ELN/pull/1772))
  * disabled create button for synced collection  ([#1811](https://github.com/ComPlat/chemotion_ELN/pull/1811))
  * advanced search for temperature or time  ([#1816](https://github.com/ComPlat/chemotion_ELN/pull/1816))
  * delete user account without confirmation  ([#1828](https://github.com/ComPlat/chemotion_ELN/pull/1828))
  * safety sheets are not imported and significantly slow down the import  ([#1779](https://github.com/ComPlat/chemotion_ELN/pull/1779))
  * docx report of reactionless samples  ([#1835](https://github.com/ComPlat/chemotion_ELN/pull/1835))
  * incorrect calculation of volume ratio for purification solvents of reactions  ([#1833](https://github.com/ComPlat/chemotion_ELN/pull/1833))
  * avoid multiple API calls to load the inbox when datasets/attachments are deleted  ([#1839](https://github.com/ComPlat/chemotion_ELN/pull/1839))
  * handle sample xref properties for when xref is null  ([#1842](https://github.com/ComPlat/chemotion_ELN/pull/1842))
  * import collection export zip when directories entries present  ([#1841](https://github.com/ComPlat/chemotion_ELN/pull/1841))

  UX/UI
  * cosmetic update of reaction-variations table  ([#1719](https://github.com/ComPlat/chemotion_ELN/pull/1719))
  * Display molecule SVG in sample SDF-import table  ([#1782](https://github.com/ComPlat/chemotion_ELN/pull/1782))

* Code refactoring
  * dry schmooze tools  ([#1684](https://github.com/ComPlat/chemotion_ELN/pull/1684))
  * extract` SpectraEditorButton` to dedicated component  ([#1664](https://github.com/ComPlat/chemotion_ELN/pull/1664))
  * rb quill delta converter  ([#1757](https://github.com/ComPlat/chemotion_ELN/pull/1757))
  * display the latest edited file on chemspectra  ([#1778](https://github.com/ComPlat/chemotion_ELN/pull/1778))
  * react-dnd target for Dataset component  ([#1795](https://github.com/ComPlat/chemotion_ELN/pull/1795))
  * svg scrubber  ([#1830](https://github.com/ComPlat/chemotion_ELN/pull/1830))
  * quill to plain text call-backs   ([#1838](https://github.com/ComPlat/chemotion_ELN/pull/1838))

* Tests
  * fix for searching cell lines  ([#1678](https://github.com/ComPlat/chemotion_ELN/pull/1678))
  * fix stub request in spectra jdx test  ([#1689](https://github.com/ComPlat/chemotion_ELN/pull/1689))
  * fix use of defunct function  ([#1837](https://github.com/ComPlat/chemotion_ELN/pull/1837))

* Chores
  * update runner - fix text  ([#1683](https://github.com/ComPlat/chemotion_ELN/pull/1683))
  * gem updates - fix missing constant MIME::Types  ([#1660](https://github.com/ComPlat/chemotion_ELN/pull/1660))
  * Bump puma from 5.6.7 to 5.6.8  ([#1679](https://github.com/ComPlat/chemotion_ELN/pull/1679))
  * update ag-grid  ([#1714](https://github.com/ComPlat/chemotion_ELN/pull/1714))
  * Bump nokogiri from 1.15.5 to 1.16.2  ([#1729](https://github.com/ComPlat/chemotion_ELN/pull/1729))
  * Bump rack from 2.2.8 to 2.2.8.1  ([#1792](https://github.com/ComPlat/chemotion_ELN/pull/1792))
  * Bump yard from 0.9.28 to 0.9.35  ([#1791](https://github.com/ComPlat/chemotion_ELN/pull/1791))
  * Bump json-jwt from 1.16.1 to 1.16.6  ([#1802](https://github.com/ComPlat/chemotion_ELN/pull/1802))
  * Bump rails from 6.1.7.6 to 6.1.7.7  ([#1787](https://github.com/ComPlat/chemotion_ELN/pull/1787))
  * Bump yard from 0.9.35 to 0.9.36  ([#1800](https://github.com/ComPlat/chemotion_ELN/pull/1800))
  * ruby nodjs  minor update   ([#1812](https://github.com/ComPlat/chemotion_ELN/pull/1812))
  * Bump webpack-dev-middleware from 5.3.1 to 5.3.4  ([#1829](https://github.com/ComPlat/chemotion_ELN/pull/1829))
  * Bump express from 4.17.3 to 4.19.2  ([#1840](https://github.com/ComPlat/chemotion_ELN/pull/1840))
  * default ketcher2 configs in UI Feature  ([#1843](https://github.com/ComPlat/chemotion_ELN/pull/1843))


## [v1.8.2]
> (2024-01-18)

* Features and enhancements
  *  feat: converter metadata  added to dataset download ([#1688](https://github.com/ComPlat/chemotion_ELN/pull/1688))


## [v1.8.1]
> (2023-12-21)

* Features and enhancements
  * converter trigger on inbox items  ([#1583](https://github.com/ComPlat/chemotion_ELN/pull/1583))
  * add the option to sort reaction list by updated time  ([#1461](https://github.com/ComPlat/chemotion_ELN/pull/1461))
  * sample list for decoupled  ([#1612](https://github.com/ComPlat/chemotion_ELN/pull/1612))
  * report peaks from XRD  ([#1614](https://github.com/ComPlat/chemotion_ELN/pull/1614))
  * display mail collector address  ([#1529](https://github.com/ComPlat/chemotion_ELN/pull/1529))
  * drag samples and elements to segment  ([#1623](https://github.com/ComPlat/chemotion_ELN/pull/1623))
  * export/import collection with chemicals  ([#1604](https://github.com/ComPlat/chemotion_ELN/pull/1604))
  * relax Mail collector rules  ([#1566](https://github.com/ComPlat/chemotion_ELN/pull/1566))
  * add volume field in inventory tab  ([#1613](https://github.com/ComPlat/chemotion_ELN/pull/1613))
  * show research plan links in reaction  ([#1575](https://github.com/ComPlat/chemotion_ELN/pull/1575))
  * sorting option for datasets and attachments in the inbox by creation-time or name  ([#1446](https://github.com/ComPlat/chemotion_ELN/pull/1446))
  * add the option to change the inbox sizing  ([#1645](https://github.com/ComPlat/chemotion_ELN/pull/1645))
  * add chemspectra with ref peaks  ([#1596](https://github.com/ComPlat/chemotion_ELN/pull/1596))

  UX/UI
  * remove the inbox section from the side panel  ([#1593](https://github.com/ComPlat/chemotion_ELN/pull/1593))
  * file size is listed in the analyses tab  ([#1601](https://github.com/ComPlat/chemotion_ELN/pull/1601))

* Bug fixes
  * bead not visible in preview and reaction details  ([#1607](https://github.com/ComPlat/chemotion_ELN/pull/1607))
  * the attachment does not get deleted from the inbox when it is assigned to sample  ([#1631](https://github.com/ComPlat/chemotion_ELN/pull/1631))
  * remove blank line when saving peak  ([#1629](https://github.com/ComPlat/chemotion_ELN/pull/1629))
  * allow import of molecule_name on sample import for xslx format  ([#1598](https://github.com/ComPlat/chemotion_ELN/pull/1598))
  * collection management right click on the add button to not drag things around  ([#1639](https://github.com/ComPlat/chemotion_ELN/pull/1639))
  * reaction sort column value not being persistent for updated_at column  ([#1643](https://github.com/ComPlat/chemotion_ELN/pull/1643))
  * si-spectra report generation to work even without preview  ([#1654](https://github.com/ComPlat/chemotion_ELN/pull/1654))
  * camelcasing attributes for proper display of SVGs  ([#1670](https://github.com/ComPlat/chemotion_ELN/pull/1670))
  * attached research_plans in screens not being imported from collection  ([#1671](https://github.com/ComPlat/chemotion_ELN/pull/1671))

  ChemSpectra and NMRIUM
  * correctly trigger action spinner when saving peaks to avoid race condition  ([#1651](https://github.com/ComPlat/chemotion_ELN/pull/1651))
  * order of J value  ([#1649](https://github.com/ComPlat/chemotion_ELN/pull/1649))
  * react-spectra-editor upd to correct molecule display with svg zoom pan  ([#1656](https://github.com/ComPlat/chemotion_ELN/pull/1656))
  * prevent crash on CV layout  ([#1637](https://github.com/ComPlat/chemotion_ELN/pull/1637))
  * update nmrglue in spectra-app to read some bruker file issue  ([#1603](https://github.com/ComPlat/chemotion_ELN/pull/1603))
  * update react-spectra-editor version to fix `Add/remove multiplicity peak` buttons  ([#1630](https://github.com/ComPlat/chemotion_ELN/pull/1630))
  * remove original data in nmrium file  ([#1661](https://github.com/ComPlat/chemotion_ELN/pull/1661))

  UX/UI
  * molecule title layout and element table header responsiveness  ([#1650](https://github.com/ComPlat/chemotion_ELN/pull/1650))


* Chores
  * upgrade-converter-to-v1.1.1  ([#1634](https://github.com/ComPlat/chemotion_ELN/pull/1634))
  * Bump rmagick from 5.0.0 to 5.3.0  ([#1609](https://github.com/ComPlat/chemotion_ELN/pull/1609))
  * upd node engine for dev container  ([#1635](https://github.com/ComPlat/chemotion_ELN/pull/1635))

* CI
  * improve Dev Setup by autorecognizing the installed tool versions  ([#1665](https://github.com/ComPlat/chemotion_ELN/pull/1665))


## [v1.8.0]
> (2023-10-24)

* Features and enhancements
  * Reaction Variations ([#1409](https://github.com/ComPlat/chemotion_ELN/pull/1409), [#1561](https://github.com/ComPlat/chemotion_ELN/pull/1561), [#1567](https://github.com/ComPlat/chemotion_ELN/pull/1567)) [Docs](https://chemotion.net/docs/eln/ui/details_modal?_highlight=variation#variations-tab)
  * LabiIMotion Integration  ([#1504](https://github.com/ComPlat/chemotion_ELN/pull/1504)) [Docs](https://chemotion.net/docs/eln/admin/generic_config)
  * Enhance import samples for sdf  ([#1364](https://github.com/ComPlat/chemotion_ELN/pull/1364))
  * Import export sample as chemical  ([#1524](https://github.com/ComPlat/chemotion_ELN/pull/1524))
  * Dry-solvent properties in the solvents section in the reactions table  ([#1432](https://github.com/ComPlat/chemotion_ELN/pull/1432))
  * Expand calendar function to generic element  ([#1585](https://github.com/ComPlat/chemotion_ELN/pull/1585))

  UX/UI
  * Move sample task inbox to header bar  ([#1517](https://github.com/ComPlat/chemotion_ELN/pull/1517))
  * Admin: Filter options for user list management  ([#1510](https://github.com/ComPlat/chemotion_ELN/pull/1510))

  ChemSpectra and NMRIUM
  * Display label in CV layout ([#1546](https://github.com/ComPlat/chemotion_ELN/pull/1546))
  * Nmrium button for reaction and researchplan  ([#1471](https://github.com/ComPlat/chemotion_ELN/pull/1471))

* Bug fixes
  * assets precompilation css issue  ([#1538](https://github.com/ComPlat/chemotion_ELN/pull/1538))
  * comment fetch issue on new entities with code refactoring  ([#1547](https://github.com/ComPlat/chemotion_ELN/pull/1547))
  * show example label for reaction  ([#1556](https://github.com/ComPlat/chemotion_ELN/pull/1556))
  * current_user.matrix getting null value  ([#1554](https://github.com/ComPlat/chemotion_ELN/pull/1554))
  * load cas for molecules  ([#1555](https://github.com/ComPlat/chemotion_ELN/pull/1555))
  * no attachments after research plan save  ([#1564](https://github.com/ComPlat/chemotion_ELN/pull/1564))
  * sample properties tab  ([#1503](https://github.com/ComPlat/chemotion_ELN/pull/1503))
  * Admin seed: ensure exisiting Admins have a profile  ([#1572](https://github.com/ComPlat/chemotion_ELN/pull/1572))
  * assign only boolean values for decoupled column in import samples  ([#1571](https://github.com/ComPlat/chemotion_ELN/pull/1571))
  * disable spectra button when just uploading an image  ([#1568](https://github.com/ComPlat/chemotion_ELN/pull/1568))
  * atttachment converter trigger ([#1578](https://github.com/ComPlat/chemotion_ELN/pull/1578))
  * reaction calculation when no reference material present  ([#1589](https://github.com/ComPlat/chemotion_ELN/pull/1589))
  * reaction list display break when reaction status not standard  ([#1592](https://github.com/ComPlat/chemotion_ELN/pull/1592))

  ChemSpectra and NMRIUM
  * UI with cv layout  ([#1526](https://github.com/ComPlat/chemotion_ELN/pull/1526))
  * nmrium button does not display when selecting some chemical ontology  ([#1563](https://github.com/ComPlat/chemotion_ELN/pull/1563))
  * change value of reference solvent for NMR layout  ([#1557](https://github.com/ComPlat/chemotion_ELN/pull/1557))

* Code refactoring - Test - CI - Chores
  * "yarn test" errors & warnings  ([#1523](https://github.com/ComPlat/chemotion_ELN/pull/1523))
  * update runner image  ([#1576](https://github.com/ComPlat/chemotion_ELN/pull/1576))
  * minor dep updates  ([#1569](https://github.com/ComPlat/chemotion_ELN/pull/1569))
  * Bump @adobe/css-tools from 4.2.0 to 4.3.1  ([#1511](https://github.com/ComPlat/chemotion_ELN/pull/1511))
  * Bump @babel/traverse from 7.16.10 to 7.23.2  ([#1580](https://github.com/ComPlat/chemotion_ELN/pull/1580))


## [v1.8.0-rc4]
> (2023-10-16)


## [v1.8.0-rc3]
> (2023-10-09)


## [v1.8.0-rc2]
> (2023-10-09)


## [v1.8.0-rc1]
> (2023-09-20)

* Features and Improvements:
  * Enhance import samples for sdf [#1364](https://github.com/ComPlat/chemotion_ELN/pull/1364)
  * Move sample task inbox to header bar [#1517](https://github.com/ComPlat/chemotion_ELN/pull/1517)
  * filter options for admin user management [#1510](https://github.com/ComPlat/chemotion_ELN/pull/1510)
  * Reaction Variations [#1409](https://github.com/ComPlat/chemotion_ELN/pull/1409)
  * LabiIMotion Integration [#1504](https://github.com/ComPlat/chemotion_ELN/pull/1504)

## [v1.7.3]
> (2023-09-20)

* Features and Improvements:
  * Always sort new sample tasks on top of list [#1456](https://github.com/ComPlat/chemotion_ELN/pull/1456)
  * add fluorescence (emission), DLS ACF, DLS Intensity layouts [#1374](https://github.com/ComPlat/chemotion_ELN/pull/1374)
  * Update CDCl3 solvent value on chemspectra and fix typo [#1480](https://github.com/ComPlat/chemotion_ELN/pull/1480)
  * Reaction table dropdown value updates [#1433](https://github.com/ComPlat/chemotion_ELN/pull/1433)
  * select all option for device inbox folder by [#1437](https://github.com/ComPlat/chemotion_ELN/pull/1437)
  * Show sample name in SampleTask Api [#1518](https://github.com/ComPlat/chemotion_ELN/pull/1518)
  * update ext links in the Navbar menu dropdown [#1534](https://github.com/ComPlat/chemotion_ELN/pull/1534)
  * Allow deletion of SampleTasks and fix SampleTask Inbox scroll issues [#1444](https://github.com/ComPlat/chemotion_ELN/pull/1444)
  * add-analysis button always visible [#1465](https://github.com/ComPlat/chemotion_ELN/pull/1465)

* chore:
  * upgrade converter 1.0.0 [#1450](https://github.com/ComPlat/chemotion_ELN/pull/1450)
  * update information of chem-spectra-app [#1484](https://github.com/ComPlat/chemotion_ELN/pull/1484)
  * Add Cypress dependencies to Dockerfiles [#1491](https://github.com/ComPlat/chemotion_ELN/pull/1491)
  * upg nodejs LTS to 18 [#1489](https://github.com/ComPlat/chemotion_ELN/pull/1489)
  * puma from 5.6.5 to 5.6.7 [#1488](https://github.com/ComPlat/chemotion_ELN/pull/1488)
  * update README - acknowledge NFDI [#1472](https://github.com/ComPlat/chemotion_ELN/pull/1472)

* Fixes:
  * disable_chemrepoidjob [#1451](https://github.com/ComPlat/chemotion_ELN/pull/1451)
  * quill_to_html when type HashWithIndifferentAccess [#1458](https://github.com/ComPlat/chemotion_ELN/pull/1458)
  * display the not-accessible panel for 401 status on sample fetched by id [#1469](https://github.com/ComPlat/chemotion_ELN/pull/1469)
  * image annotation tool image preview does not work as expected [#1467](https://github.com/ComPlat/chemotion_ELN/pull/1467)
  * White screen research plan [#1452](https://github.com/ComPlat/chemotion_ELN/pull/1452)
  * wellplates multiple readouts design tab [#1474](https://github.com/ComPlat/chemotion_ELN/pull/1474)
  * Cypress Tests [#1481](https://github.com/ComPlat/chemotion_ELN/pull/1481)
  * the issue with NMRium wrapper version 0.4.0 [#1436](https://github.com/ComPlat/chemotion_ELN/pull/1436)
  * nmrium button [#1460](https://github.com/ComPlat/chemotion_ELN/pull/1460)
  * replace toSorted with manual sorting in SampleTaskInbox [#1485](https://github.com/ComPlat/chemotion_ELN/pull/1485)
  * duplicate jdx files by [#1479](https://github.com/ComPlat/chemotion_ELN/pull/1479)
  * sorting multiplicity values [#1478](https://github.com/ComPlat/chemotion_ELN/pull/1478)
  * inbox UnsortedBox issues [#1447](https://github.com/ComPlat/chemotion_ELN/pull/1447)
  * deletion of literature [#1502](https://github.com/ComPlat/chemotion_ELN/pull/1502)
  * doi not accepted [#1486](https://github.com/ComPlat/chemotion_ELN/pull/1486)
  * fixed wrong literatures mapping [#1506](https://github.com/ComPlat/chemotion_ELN/pull/1506)
  * ignore predictions when it is null [#1507](https://github.com/ComPlat/chemotion_ELN/pull/1507)
  * crash when selecting multiplicity checkbox on chemspectra [#1509](https://github.com/ComPlat/chemotion_ELN/pull/1509)
  * sync chemspectra nmrium eln v173 [#1513](https://github.com/ComPlat/chemotion_ELN/pull/1513)
  * Update Chemspectra to handle 'FL Spectrum' datatype and fix cannot read processed Bruker data NMR [#1528](https://github.com/ComPlat/chemotion_ELN/pull/1528)
  * yield percentage error for reactions with decoupled products and … [#1531](https://github.com/ComPlat/chemotion_ELN/pull/1531)
  * reaction sort column default to created_at [#1533](https://github.com/ComPlat/chemotion_ELN/pull/1533)


## [v1.7.2]
> (2023-08-01)

* Fixes:
  * Comment functionality, closes #1435
  * Sort reactions by creation time  4922fc3, closes #1439
  * display wrong shifted peaks after zoom, closes #1443

## [v1.7.1]
> 2023-07-27

* Fixes:
  * Report creation for shared reaction [#1412](https://github.com/ComPlat/chemotion_ELN/pull/1412)
  * Collection tab profile [#1411](https://github.com/ComPlat/chemotion_ELN/pull/1411) [1427](https://github.com/ComPlat/chemotion_ELN/pull/1427)
  * opening a dataset without making changes [#1410](https://github.com/ComPlat/chemotion_ELN/pull/1410)
  * inbox (de)select boxes [#1416](https://github.com/ComPlat/chemotion_ELN/pull/1416)
  * sort reaction list by creation date [#1429](https://github.com/ComPlat/chemotion_ELN/pull/1429)
  * change ref area and display shift ref [#1431]( https://github.com/ComPlat/chemotion_ELN/pull/1431)
  * total element count in list tabs [#1426]( https://github.com/ComPlat/chemotion_ELN/pull/1426)


## [v1.7.0]
> 2023-07-11

* Features and Improvements:
   * Inventory Feature [#1262](https://github.com/ComPlat/chemotion_ELN/pull/1262) - [see docs](https://chemotion.net/docs/eln/ui/inventory#creating-chemical-entry)
   * Comment functionality on shared and synchronized collections  [#1237](https://github.com/ComPlat/chemotion_ELN/pull/1237) - [see docs](https://chemotion.net/docs/eln/ui/comments?_highlight=comment)
   * calendar [#1189](https://github.com/ComPlat/chemotion_ELN/pull/1189)
   * collection profile for element tab layout  [#681](https://github.com/ComPlat/chemotion_ELN/pull/681) - [see docs]()
   * cas as option in import samples to collection function [#1306](https://github.com/ComPlat/chemotion_ELN/pull/1306)
   * chemspectra with aif layout [#1335](https://github.com/ComPlat/chemotion_ELN/pull/1335)
   * Feature/elements grouping [#1188](https://github.com/ComPlat/chemotion_ELN/pull/1188)
   * enhance import sample feature [#1347](https://github.com/ComPlat/chemotion_ELN/pull/1341)
   * Groups ui revamp and making group admins set/unset admins  [#1396](https://github.com/ComPlat/chemotion_ELN/pull/1396)
   * Add inbox pagination [#1108](https://github.com/ComPlat/chemotion_ELN/pull/1108)
   * login-and-signup-configurable [#1377](https://github.com/ComPlat/chemotion_ELN/pull/1377)

* Fixes
  * port fixes from v1.6.1 v1.6.2
  * Datacollector api fx [#1344](https://github.com/ComPlat/chemotion_ELN/pull/1344)
  * notification timestamps and formatting notification button [#1362](https://github.com/ComPlat/chemotion_ELN/pull/1362)
  * saving data from NMRium [#1348](https://github.com/ComPlat/chemotion_ELN/pull/1348)
  * Structure editor with decoupled sample [#1393](https://github.com/ComPlat/chemotion_ELN/pull/1393)
  * User select in UI feature [#1385](https://github.com/ComPlat/chemotion_ELN/pull/1385)
  * Unsaved sample changes retained when reselected from list [#1397](https://github.com/ComPlat/chemotion_ELN/pull/1397)



## [v1.6.2]
> 2023-07-10
* Fixes
  * Expose target amount in sample task api (#1373)
  * User select in UI feature (#1385)
  * refactoring transfer (#1320)
  * login-and-signup-configurable (#1377)
  * structure editor with decoupled sample (#1393)
  * Text editor in researchPlan is now getting removed properly (#1363)

## [v1.6.1]
> 2023-06-19

* Fixes
  * scan result calculation [PR1325](https://github.com/ComPlat/chemotion_ELN/pull/1325)
  * Load the correct url of nmrium wrapper [#1339](https://github.com/ComPlat/chemotion_ELN/pull/1339)
  * Zooming in chemspectra on firefox [#1346](https://github.com/ComPlat/chemotion_ELN/pull/1346)
  * AdminUI: Datacollector setting [#1344](https://github.com/ComPlat/chemotion_ELN/pull/1344)
  * nmrium: display preview image after saving [#1356](https://github.com/ComPlat/chemotion_ELN/pull/1356)


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
