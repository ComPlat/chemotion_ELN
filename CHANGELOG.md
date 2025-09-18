# Chemotion_ELN Changelog

## Latest

## [v2.1.0]
> (2025-08-24)

* Features and enhancements
  * search sample by custom molecule name  ([#2603](https://github.com/ComPlat/chemotion_ELN/pull/2603))
  * enhance history tracker for reaction variations  ([#2375](https://github.com/ComPlat/chemotion_ELN/pull/2375))
  * track device description changes  ([#2573](https://github.com/ComPlat/chemotion_ELN/pull/2573))
  * improve dataset save action for element analysis  ([#2468](https://github.com/ComPlat/chemotion_ELN/pull/2468))
  * create multiple analyses by uploading multiple files and folders at once  ([#2526](https://github.com/ComPlat/chemotion_ELN/pull/2526))

* Bug fixes
  * tooltip issue while transmitting data to repository  ([#2570](https://github.com/ComPlat/chemotion_ELN/pull/2570))
  * persist coefficient value on material change in reaction scheme  ([#2563](https://github.com/ComPlat/chemotion_ELN/pull/2563))
  * message api param  ([#2599](https://github.com/ComPlat/chemotion_ELN/pull/2599))
  * checkbox state when collapsing/expanding the elements in List  ([#2604](https://github.com/ComPlat/chemotion_ELN/pull/2604))
  * custom labels getting deleted from reactions  ([#2593](https://github.com/ComPlat/chemotion_ELN/pull/2593))
  * import chemical lost option  ([#2607](https://github.com/ComPlat/chemotion_ELN/pull/2607))
  * chemical export queries with select all samples  ([#2605](https://github.com/ComPlat/chemotion_ELN/pull/2605))
  * invalid statement in advanced search  ([#2613](https://github.com/ComPlat/chemotion_ELN/pull/2613))
  * no attachment handling in ImageModal to prevent crashes  ([#2618](https://github.com/ComPlat/chemotion_ELN/pull/2618))
  * rendering short label link in research plan table  ([#2601](https://github.com/ComPlat/chemotion_ELN/pull/2601))
  * resolve research plan table column renaming and short label link…  ([#2627](https://github.com/ComPlat/chemotion_ELN/pull/2627))
  * advanced search listing for non sample elements  ([#2633](https://github.com/ComPlat/chemotion_ELN/pull/2633))
  * tabs navigation in advanced search result  ([#2639](https://github.com/ComPlat/chemotion_ELN/pull/2639))
  * reaction-variations: ensure safe serialization of metadata  ([#2629](https://github.com/ComPlat/chemotion_ELN/pull/2629))
  * handle report generation request with an empty selection of items  ([#2644](https://github.com/ComPlat/chemotion_ELN/pull/2644))
  * toggle well and user-label colors  ([#2536](https://github.com/ComPlat/chemotion_ELN/pull/2536))


  ChemSpectra and NMRIUM
  * bump react-spectra-editor to 1.4.0  ([#2634](https://github.com/ComPlat/chemotion_ELN/pull/2634))
  * render one Spectra modal per analyses-list  ([#2572](https://github.com/ComPlat/chemotion_ELN/pull/2572))
  * only strip last extension in fname_wo_ext to preserve internal dots  ([#2581](https://github.com/ComPlat/chemotion_ELN/pull/2581))
  * Display Unicode unit labels correctly  ([#2660](https://github.com/ComPlat/chemotion_ELN/pull/2660))


* Performance improvements
  * add indices to improve sample serialization  ([#2554](https://github.com/ComPlat/chemotion_ELN/pull/2554))

* Styles
  * change group name in device description list  ([#2589](https://github.com/ComPlat/chemotion_ELN/pull/2589))
  * improve yield/conversion rate toggle button implementation  ([#2620](https://github.com/ComPlat/chemotion_ELN/pull/2620))

* Chores
  * update annotate gem  ([#2575](https://github.com/ComPlat/chemotion_ELN/pull/2575))
  * remove unused files  ([#2586](https://github.com/ComPlat/chemotion_ELN/pull/2586))
  * Bump thor from 1.3.2 to 1.4.0  ([#2609](https://github.com/ComPlat/chemotion_ELN/pull/2609))
  * bump nodejs engine from 22.16.0 to 22.17.1  ([#2626](https://github.com/ComPlat/chemotion_ELN/pull/2626))
  * bump nodejs to minor 22.18 and other packages  ([#2648](https://github.com/ComPlat/chemotion_ELN/pull/2648))
  * Bump tmp from 0.2.1 to 0.2.5  ([#2650](https://github.com/ComPlat/chemotion_ELN/pull/2650))
  * bump service dependencies  ([#2641](https://github.com/ComPlat/chemotion_ELN/pull/2641))
  * Bump jspdf from 3.0.0 to 3.0.1  ([#2656](https://github.com/ComPlat/chemotion_ELN/pull/2656))

## [v2.0.1]
> (2025-06-04)

* Enhancements
  * Reaction variations: 
    - propagate material edits from scheme-tab to variations-tab  ([#2490](https://github.com/ComPlat/chemotion_ELN/pull/2490))
    - improve persisting of grid layout reaction variations  ([#2527](https://github.com/ComPlat/chemotion_ELN/pull/2527))
  * add sample uuid to sample exports  ([#2520](https://github.com/ComPlat/chemotion_ELN/pull/2520), [#2529](https://github.com/ComPlat/chemotion_ELN/pull/2529))

* Bug fixes

  UX/UI
  * minor  ([#2514](https://github.com/ComPlat/chemotion_ELN/pull/2514))
  * correctly display yield field when conversion rate is null  ([#2535](https://github.com/ComPlat/chemotion_ELN/pull/2535))
  * show instrument suggestions dropdown in dataset metadata  ([#2511](https://github.com/ComPlat/chemotion_ELN/pull/2511))
  * don't render variations of new, unsaved reaction  ([#2521](https://github.com/ComPlat/chemotion_ELN/pull/2521))
  * drag-n-drop preview drift in collection management  ([#2494](https://github.com/ComPlat/chemotion_ELN/pull/2494))
  * guard against undefined reference material in reaction variations  ([#2523](https://github.com/ComPlat/chemotion_ELN/pull/2523))
  * prevent null cas search and show instrument modal on top of Gene…  ([#2537](https://github.com/ComPlat/chemotion_ELN/pull/2537))

* Performance improvements
  * rm image preview from container and attachment entities  ([#2516](https://github.com/ComPlat/chemotion_ELN/pull/2516))

* Refactoring/Styles

  UX/UI
  * tables from bootstrap to ag-grid  ([#2437](https://github.com/ComPlat/chemotion_ELN/pull/2437))
  * rework list and group rendering  ([#2440](https://github.com/ComPlat/chemotion_ELN/pull/2440))
  * reaction-variation badges only visible if variations present  ([#2533](https://github.com/ComPlat/chemotion_ELN/pull/2533))
  * warning for reaction analysis vs sample analysis in the Reaction-analyses tab ([#2513](https://github.com/ComPlat/chemotion_ELN/pull/2513))

## [v2.0.0]
> (2025-05-13)

### Features and Enhancements
#### Major Changes
  * Labimotion-2.0.0 [:books: docs](https://chemotion.net/docs/labimotion) ([#2261](https://github.com/ComPlat/chemotion_ELN/pull/2261), [#2418](https://github.com/ComPlat/chemotion_ELN/pull/2418), [#2360](https://github.com/ComPlat/chemotion_ELN/pull/2360), [#2348](https://github.com/ComPlat/chemotion_ELN/pull/2348))
  * Change-history tracker with UI for auditing record changes [:books: docs](https://chemotion.net/docs/labimotion/user/features/revisions) ([#2068](https://github.com/ComPlat/chemotion_ELN/pull/2068), [#2423](https://github.com/ComPlat/chemotion_ELN/pull/2423), [#2479](https://github.com/ComPlat/chemotion_ELN/pull/2479), [#2461](https://github.com/ComPlat/chemotion_ELN/pull/2461), [#2458](https://github.com/ComPlat/chemotion_ELN/pull/2458), [#2457](https://github.com/ComPlat/chemotion_ELN/pull/2457), [#2451](https://github.com/ComPlat/chemotion_ELN/pull/2451), [#2345](https://github.com/ComPlat/chemotion_ELN/pull/2345), [#2484](https://github.com/ComPlat/chemotion_ELN/pull/2484)) 
  * Tagging with user defined labels of screen well-plate and research plan ([#2331](https://github.com/ComPlat/chemotion_ELN/pull/2331))
  * User-storage usage and quota ([#2274](https://github.com/ComPlat/chemotion_ELN/pull/2274))
  * Rdkit cart substructure search ([#2055](https://github.com/ComPlat/chemotion_ELN/pull/2055), [#2361](https://github.com/ComPlat/chemotion_ELN/pull/2361))
  * Device-description - a new element for user to define a device set up ([#2281](https://github.com/ComPlat/chemotion_ELN/pull/2281), [#2395](https://github.com/ComPlat/chemotion_ELN/pull/2395), [#2397](https://github.com/ComPlat/chemotion_ELN/pull/2397), [#2338](https://github.com/ComPlat/chemotion_ELN/pull/2338))
  
  
#### More updates
  * ReactionVariation:
    * add volume to editable entries of reaction variation materials ([#2426](https://github.com/ComPlat/chemotion_ELN/pull/2426))
    * user-selectable columns for reaction variations table ([#2364](https://github.com/ComPlat/chemotion_ELN/pull/2364), [#2419](https://github.com/ComPlat/chemotion_ELN/pull/2419))
    * Incorporate "Gas Scheme" feature in reaction variations table ([#2250](https://github.com/ComPlat/chemotion_ELN/pull/2250))

  * Inventory
    * display sample inventory label tag in sample header and  list ([#2222](https://github.com/ComPlat/chemotion_ELN/pull/2222))
    * inventory label reset ([#2367](https://github.com/ComPlat/chemotion_ELN/pull/2367))
    * expiration date and storage temperature fields in inventory ([#2152](https://github.com/ComPlat/chemotion_ELN/pull/2152))

  * Import/Export
    * enhance attachment fetching in export collections ([#2474](https://github.com/ComPlat/chemotion_ELN/pull/2474))
    * enhance import process with discarded attachments of research_plans ([#2482](https://github.com/ComPlat/chemotion_ELN/pull/2482))
    * import samples additional attributes ([#2214](https://github.com/ComPlat/chemotion_ELN/pull/2214))

  * Advanced search for analyses datasets ([#2179](https://github.com/ComPlat/chemotion_ELN/pull/2179))
  * Sample conversion rate (%) in a reaction scheme ([#2159](https://github.com/ComPlat/chemotion_ELN/pull/2159))
  * split cell lines ([#2276](https://github.com/ComPlat/chemotion_ELN/pull/2276))
  * add general comment field to analysis section of any element ([#2241](https://github.com/ComPlat/chemotion_ELN/pull/2241))

  * Add simple cors config for public TPA interaction ([#2047](https://github.com/ComPlat/chemotion_ELN/pull/2047))

### Bug Fixes

  * Kecher2 SVGs: client side re-indexing of SVG glyph IDs and xlink:href for Ket2 svgs ([#2480](https://github.com/ComPlat/chemotion_ELN/pull/2480))
  * handling deletion of image for research plan from the attachment list ([#2478](https://github.com/ComPlat/chemotion_ELN/pull/2478))
  * reaction variations optional field access ([#2476](https://github.com/ComPlat/chemotion_ELN/pull/2476))
  * correct total volume used in solvent volume ratio calculation ([#2466](https://github.com/ComPlat/chemotion_ELN/pull/2466))
  * reporter quill delta to html to handle blank inputs ([#2465](https://github.com/ComPlat/chemotion_ELN/pull/2465))
  * attachment serialization errors when thumbnail previews cannot be retrieved ([#2450](https://github.com/ComPlat/chemotion_ELN/pull/2450))
  * creating molecule with wrong valence ([#2444](https://github.com/ComPlat/chemotion_ELN/pull/2444), [#2453](https://github.com/ComPlat/chemotion_ELN/pull/2453))
  * selecting cas for a sample breaks when sample has multiple cids ([#2447](https://github.com/ComPlat/chemotion_ELN/pull/2447), [#2463](https://github.com/ComPlat/chemotion_ELN/pull/2463))
  * creating pdf prints codes if a SVG of one of the selected samples is not available ([#2445](https://github.com/ComPlat/chemotion_ELN/pull/2445))
  * permission on cellline-materials - index on name source and created_by column ([#2353](https://github.com/ComPlat/chemotion_ELN/pull/2353))
  * pdf-reader for analysis preview ([#2386](https://github.com/ComPlat/chemotion_ELN/pull/2386))
  * scroll reaction long description ([#2376](https://github.com/ComPlat/chemotion_ELN/pull/2376))
  * import well-plate readouts w some templates - import button missing. ([#2358](https://github.com/ComPlat/chemotion_ELN/pull/2358))
  * the lock equiv. not working if amount_mol of the reference is changed ([#2312](https://github.com/ComPlat/chemotion_ELN/pull/2312))
  * reset real masses on copy reaction ([#2349](https://github.com/ComPlat/chemotion_ELN/pull/2349))
  * rdkit search query ([#2372](https://github.com/ComPlat/chemotion_ELN/pull/2372))
  * retain novnc password during device update ([#2343](https://github.com/ComPlat/chemotion_ELN/pull/2343))
  * device email editable ([#2321](https://github.com/ComPlat/chemotion_ELN/pull/2321), [#2427](https://github.com/ComPlat/chemotion_ELN/pull/2427))
  * filter invalid user ids ([#2322](https://github.com/ComPlat/chemotion_ELN/pull/2322), [#2342](https://github.com/ComPlat/chemotion_ELN/pull/2342))
  * prevent create molecules with invalid molfile using faulty smiles ([#2255](https://github.com/ComPlat/chemotion_ELN/pull/2255), [#2431](https://github.com/ComPlat/chemotion_ELN/pull/2431))
  * show header for yield/equiv. column in reaction scheme independently of the element permissions ([#2271](https://github.com/ComPlat/chemotion_ELN/pull/2271))
  * reaction variations: update variations' sample IDs when reaction is copied ([#2265](https://github.com/ComPlat/chemotion_ELN/pull/2265))
  * reaction report generation for gas products when the vessel size is not given(#2254) ()
  * report: generating report for gas scheme reaction ([#2390](https://github.com/ComPlat/chemotion_ELN/pull/2390))
  * skip uploading new but discarded attachments ([#2251](https://github.com/ComPlat/chemotion_ELN/pull/2251))
  * bootstrap styles ([#2225](https://github.com/ComPlat/chemotion_ELN/pull/2225))
  * import collection with faulty svg ([#2428](https://github.com/ComPlat/chemotion_ELN/pull/2428))
  * selecting all pages with advanced/detail search corrected ([#2282](https://github.com/ComPlat/chemotion_ELN/pull/2282))
  * layout and event propagation in sample and reaction panel ([#2462](https://github.com/ComPlat/chemotion_ELN/pull/2462))
  * remove unnecessary min-width from svg style ([#2443](https://github.com/ComPlat/chemotion_ELN/pull/2443), [#2457](https://github.com/ComPlat/chemotion_ELN/pull/2457))
  * minor css / react improvements and fixes ([#2421](https://github.com/ComPlat/chemotion_ELN/pull/2421), [#2436](https://github.com/ComPlat/chemotion_ELN/pull/2436))
  * drag-n-drop with touch and mouse event ([#2398](https://github.com/ComPlat/chemotion_ELN/pull/2398))
  * improve unit switch behavior for reaction scheme gase phase inputs ([#2396](https://github.com/ComPlat/chemotion_ELN/pull/2396))
  * disabled drag-and-drop handle for list samples and molecules to element target ([#2400](https://github.com/ComPlat/chemotion_ELN/pull/2400))
  * element list (un)collapse of sample group ([#2362](https://github.com/ComPlat/chemotion_ELN/pull/2362))
  * element tab layout setting per collection ([#2382](https://github.com/ComPlat/chemotion_ELN/pull/2382))
  * value of Select input from Sample molecule name and report template ([#2369](https://github.com/ComPlat/chemotion_ELN/pull/2369))
  * adjust css for scrollbar and hidden dropdown ([#2324](https://github.com/ComPlat/chemotion_ELN/pull/2324))
  * display short label on reaction scheme hover ([#2310](https://github.com/ComPlat/chemotion_ELN/pull/2310))
  * color-coding of save-status in reaction detail card #2306 ()
  * reaction variations table style and appearance ([#2285](https://github.com/ComPlat/chemotion_ELN/pull/2285))
  * Affiliation: silent network error on affiliation deletion api call ([#2407](https://github.com/ComPlat/chemotion_ELN/pull/2407))
  * datacollector: messaging user for incoming files from datacollector device ([#2404](https://github.com/ComPlat/chemotion_ELN/pull/2404))

#### Nmrium/ChemSpectra
  * blank page on requesting unauthorized files for nmrium ([#2387](https://github.com/ComPlat/chemotion_ELN/pull/2387))
  * display exact mass instead of theoretical mass ([#2298](https://github.com/ComPlat/chemotion_ELN/pull/2298))
  * bump service chem-spectra-app to v.1.2.4 ([#2253](https://github.com/ComPlat/chemotion_ELN/pull/2253))

#### worker
  * allow multiple delayed_job named-queue pools ([#2258](https://github.com/ComPlat/chemotion_ELN/pull/2258))

#### data/migration
  * manage matrice sequence id ([#2257](https://github.com/ComPlat/chemotion_ELN/pull/2257))
  * remap glyph ids and references to them in ket svgs ([#2483](https://github.com/ComPlat/chemotion_ELN/pull/2483), [#2496](https://github.com/ComPlat/chemotion_ELN/pull/2496))


### Documentation
  * update changelog 1.10. with link to chemotion.net docs ([#2289](https://github.com/ComPlat/chemotion_ELN/pull/2289))

### Styles/UI
  * correct formatting of a sample molarity added to the description of a reaction ([#2315](https://github.com/ComPlat/chemotion_ELN/pull/2315))
  * standardize capitalization for section titles ([#2394](https://github.com/ComPlat/chemotion_ELN/pull/2394), [#2414](https://github.com/ComPlat/chemotion_ELN/pull/2414))
  * rearrange the order of elemental composition ([#2305](https://github.com/ComPlat/chemotion_ELN/pull/2305))

### Code Refactoring

  * ! update react-bootstrap library ([#1930](https://github.com/ComPlat/chemotion_ELN/pull/1930), [#2492](https://github.com/ComPlat/chemotion_ELN/pull/2492), [#2439](https://github.com/ComPlat/chemotion_ELN/pull/2439), [#2240](https://github.com/ComPlat/chemotion_ELN/pull/2240), [#2416](https://github.com/ComPlat/chemotion_ELN/pull/2416), [#2392](https://github.com/ComPlat/chemotion_ELN/pull/2392), [#2415](https://github.com/ComPlat/chemotion_ELN/pull/2415), [#2366](https://github.com/ComPlat/chemotion_ELN/pull/2366))
  * ! datacollector ([#2240](https://github.com/ComPlat/chemotion_ELN/pull/2240), [#2459](https://github.com/ComPlat/chemotion_ELN/pull/2459), [#2267](https://github.com/ComPlat/chemotion_ELN/pull/2267))
  * ! deprecate rdkit-gem in favor of using rdkit cartridge ([#2417](https://github.com/ComPlat/chemotion_ELN/pull/2417))
  * ! migrate to shakapacker ([#2236](https://github.com/ComPlat/chemotion_ELN/pull/2236), [#2350](https://github.com/ComPlat/chemotion_ELN/pull/2350))
  * sum formula handling for molecule creation ([#2495](https://github.com/ComPlat/chemotion_ELN/pull/2495))
  * define a default admin getter ([#2448](https://github.com/ComPlat/chemotion_ELN/pull/2448))
  * set default element counter of the user on demand ([#2337](https://github.com/ComPlat/chemotion_ELN/pull/2337))
  * Remove UNSAFE_ react lifecycle hooks ([#2196](https://github.com/ComPlat/chemotion_ELN/pull/2196), [#2352](https://github.com/ComPlat/chemotion_ELN/pull/2352), [#2346](https://github.com/ComPlat/chemotion_ELN/pull/2346))
  * quill editor and other warnings ([#2218](https://github.com/ComPlat/chemotion_ELN/pull/2218))

### Tests
  * fix flaky spec ([#2460](https://github.com/ComPlat/chemotion_ELN/pull/2460))
  * add factories and test cases for molecules-samples and their structure attributes ([#2429](https://github.com/ComPlat/chemotion_ELN/pull/2429))

### Chores
#### dependencies
  * Bump net-imap from 0.4.19 to 0.4.20 ([#2469](https://github.com/ComPlat/chemotion_ELN/pull/2469))
  * Bump rack from 2.2.13 to 2.2.14 ([#2493](https://github.com/ComPlat/chemotion_ELN/pull/2493))
  * miscellaneous db/schema - annotation - bump minor nodejs ([#2485](https://github.com/ComPlat/chemotion_ELN/pull/2485))
  * Bump http-proxy-middleware from 2.0.7 to 2.0.9 ([#2454](https://github.com/ComPlat/chemotion_ELN/pull/2454))
  * update service dependencies ([#2452](https://github.com/ComPlat/chemotion_ELN/pull/2452))
  * Bump canvg from 3.0.10 to 3.0.11 ([#2393](https://github.com/ComPlat/chemotion_ELN/pull/2393))
  * Bump @babel/helpers from 7.20.1 to 7.26.10 ([#2385](https://github.com/ComPlat/chemotion_ELN/pull/2385))
  * Bump graphql from 2.1.13 to 2.1.15 ([#2389](https://github.com/ComPlat/chemotion_ELN/pull/2389))
  * Bump @babel/runtime from 7.26.7 to 7.26.10 ([#2384](https://github.com/ComPlat/chemotion_ELN/pull/2384))
  * bump @complat/chemotion-converter-app from 0.12.0 to 0.13.0 ([#2379](https://github.com/ComPlat/chemotion_ELN/pull/2379))
  * update chemical inventory msds mapper ([#2318](https://github.com/ComPlat/chemotion_ELN/pull/2318))
  * Bump rack from 2.2.12 to 2.2.13 ([#2377](https://github.com/ComPlat/chemotion_ELN/pull/2377))
  * Bump rack from 2.2.11 to 2.2.12 ([#2370](https://github.com/ComPlat/chemotion_ELN/pull/2370))
  * Bumps rails-html-sanitizer from 1.6.0 to 1.6.2 ([#2294](https://github.com/ComPlat/chemotion_ELN/pull/2294))
  * bump packages for @babel and test ([#2355](https://github.com/ComPlat/chemotion_ELN/pull/2355))
  * update service dependencies ([#2351](https://github.com/ComPlat/chemotion_ELN/pull/2351))
  * Bump rack from 2.2.9 to 2.2.11 ([#2332](https://github.com/ComPlat/chemotion_ELN/pull/2332))
  * Bump net-imap from 0.4.17 to 0.4.19 ([#2323](https://github.com/ComPlat/chemotion_ELN/pull/2323))
  * bump github action for test coverage - lcov report ([#2317](https://github.com/ComPlat/chemotion_ELN/pull/2317))
  * Bump cross-spawn from 7.0.3 to 7.0.6 ([#2243](https://github.com/ComPlat/chemotion_ELN/pull/2243))
  * upd Gemfile.lock and model annotation ([#2269](https://github.com/ComPlat/chemotion_ELN/pull/2269))
  * Bump labimotion from 1.4.0.2 to 1.4.1 - chem-generic-ui to 1.4.9 ([#2228](https://github.com/ComPlat/chemotion_ELN/pull/2228))
  * Minor fixes & improvements ([#2232](https://github.com/ComPlat/chemotion_ELN/pull/2232))
  * Bump rexml from 3.3.6 to 3.3.9 ([#2231](https://github.com/ComPlat/chemotion_ELN/pull/2231))
  * Bump http-proxy-middleware from 2.0.4 to 2.0.7 ([#2229](https://github.com/ComPlat/chemotion_ELN/pull/2229))
  * Remove unused/obsolete dependencies and code, render fewer HTML tags ([#2223](https://github.com/ComPlat/chemotion_ELN/pull/2223))
  * Bump actiontext from 6.1.7.8 to 6.1.7.9 ([#2219](https://github.com/ComPlat/chemotion_ELN/pull/2219))
  * Bump actionpack from 6.1.7.8 to 6.1.7.9 ([#2220](https://github.com/ComPlat/chemotion_ELN/pull/2220))
  * Bump actionmailer from 6.1.7.8 to 6.1.7.9 ([#2221](https://github.com/ComPlat/chemotion_ELN/pull/2221))
  * yarn.lock patch and minor updates ([#2329](https://github.com/ComPlat/chemotion_ELN/pull/2329), [#2335](https://github.com/ComPlat/chemotion_ELN/pull/2335))
  * dependencies bump - minor and patch ([#2422](https://github.com/ComPlat/chemotion_ELN/pull/2422))
  * bump nodejs from 18.20.6 to latest LTS 22.14 ([#2328](https://github.com/ComPlat/chemotion_ELN/pull/2328))
#### api
  * remove unused end-point ([#2464](https://github.com/ComPlat/chemotion_ELN/pull/2464))
#### services
  * bump services ([#2409](https://github.com/ComPlat/chemotion_ELN/pull/2409), [#2424](https://github.com/ComPlat/chemotion_ELN/pull/2424), [#2270](https://github.com/ComPlat/chemotion_ELN/pull/2270))
#### csp
  * update Content Security Policy directives ([#2399](https://github.com/ComPlat/chemotion_ELN/pull/2399))

### Build
#### dev
  * update postgres client to 16 ([#2403](https://github.com/ComPlat/chemotion_ELN/pull/2403))
  * option for setting service image and volume names ([#2288](https://github.com/ComPlat/chemotion_ELN/pull/2288))
  * fix webpacker config ([#2280](https://github.com/ComPlat/chemotion_ELN/pull/2280))
  * Add missing jq package in docker dev env ([#2278](https://github.com/ComPlat/chemotion_ELN/pull/2278))
#### test
  * simplify db setup for github action ([#2365](https://github.com/ComPlat/chemotion_ELN/pull/2365))
  * fix asset compilation testing manual workflow ([#2268](https://github.com/ComPlat/chemotion_ELN/pull/2268))


## [v2.0.0-rc3]
> (2025-05-12)


* Features and enhancements
  * add volume to editable entries of reaction variation materials  ([#2426](https://github.com/ComPlat/chemotion_ELN/pull/2426))
  * add created_by_type to attachments  ([#2459](https://github.com/ComPlat/chemotion_ELN/pull/2459))
  * enable soft-deletion for attachment  ([#2484](https://github.com/ComPlat/chemotion_ELN/pull/2484))
  * enhance import process with discarded attachments of research_plans  ([#2482](https://github.com/ComPlat/chemotion_ELN/pull/2482))
  * add simple cors config for public TPA interaction  ([#2047](https://github.com/ComPlat/chemotion_ELN/pull/2047))

  UX/UI
  * history tracker update  ([#2479](https://github.com/ComPlat/chemotion_ELN/pull/2479))

* Bug fixes

  UX/UI
  * minor css / react improvements and fixes  ([#2421](https://github.com/ComPlat/chemotion_ELN/pull/2421))
  * click on reaction link from sample list always showing the warning modal  ([#2439](https://github.com/ComPlat/chemotion_ELN/pull/2439))
  * remove unnecessary min-width from svg style  ([#2443](https://github.com/ComPlat/chemotion_ELN/pull/2443))
  * regression introduced by #2068  ([#2461](https://github.com/ComPlat/chemotion_ELN/pull/2461))
  * layout and event propagation in sample and reaction card  ([#2462](https://github.com/ComPlat/chemotion_ELN/pull/2462))
  * molfile info in sample card - chemical identifiers  ([#2492](https://github.com/ComPlat/chemotion_ELN/pull/2492))
  * handling proper recipient when looping over the envelopes  ([#2427](https://github.com/ComPlat/chemotion_ELN/pull/2427))
  * import collection with faulty svg  ([#2428](https://github.com/ComPlat/chemotion_ELN/pull/2428))
  * update state for import samples to collection button  ([#2436](https://github.com/ComPlat/chemotion_ELN/pull/2436))
  * rdkit seed - drop trigger if feature disabled but rdkit schema present  ([#2449](https://github.com/ComPlat/chemotion_ELN/pull/2449))
  * creating pdf prints codes if a SVG of one of the selected samples is not available  ([#2445](https://github.com/ComPlat/chemotion_ELN/pull/2445))
  * selecting cas for a sample breaks when sample has multiple cids  ([#2447](https://github.com/ComPlat/chemotion_ELN/pull/2447))
  * molecule index on inchkey-sum formula to bypass openbabel  formula issue  ([#2444](https://github.com/ComPlat/chemotion_ELN/pull/2444))
  * attachment serialization errors when thumbnail previews cannot be retrieved  ([#2450](https://github.com/ComPlat/chemotion_ELN/pull/2450))
  * use molecule ID instead of inchikey for names molecule api endpoint  ([#2453](https://github.com/ComPlat/chemotion_ELN/pull/2453))
  * css for image and svg in history tracker  ([#2457](https://github.com/ComPlat/chemotion_ELN/pull/2457))
  * de-type deleted user-device  ([#2458](https://github.com/ComPlat/chemotion_ELN/pull/2458))
  * arg parsing to query pubchem by cid  ([#2463](https://github.com/ComPlat/chemotion_ELN/pull/2463))
  * reporter quill delta to html to handle blank inputs  ([#2465](https://github.com/ComPlat/chemotion_ELN/pull/2465))
  * correct total volume used in solvent volume ratio calculation  ([#2466](https://github.com/ComPlat/chemotion_ELN/pull/2466))
  * reaction variations optional field access  ([#2476](https://github.com/ComPlat/chemotion_ELN/pull/2476))
  * research plan export with image attachment  ([#2474](https://github.com/ComPlat/chemotion_ELN/pull/2474))
  * handling deletion of image for research plan from the attachment list  ([#2478](https://github.com/ComPlat/chemotion_ELN/pull/2478))
  * ensure unicity of SVG glyph IDs and references on Ket2 svgs  ([#2480](https://github.com/ComPlat/chemotion_ELN/pull/2480))
  * remap glyph ids and references to them in ket svgs  ([#2483](https://github.com/ComPlat/chemotion_ELN/pull/2483))
  * sample SVG solid support bead not visible  ([#2496](https://github.com/ComPlat/chemotion_ELN/pull/2496))

* Code refactoring
  * define a default admin getter  ([#2448](https://github.com/ComPlat/chemotion_ELN/pull/2448))
  * rename labels in the history tracker  ([#2451](https://github.com/ComPlat/chemotion_ELN/pull/2451))
  * sum formula handling for molecule creation  ([#2495](https://github.com/ComPlat/chemotion_ELN/pull/2495))

* Tests
  * add factories and test cases for molecules-samples and their structure attributes  ([#2429](https://github.com/ComPlat/chemotion_ELN/pull/2429))
  * fix flaky spec  ([#2460](https://github.com/ComPlat/chemotion_ELN/pull/2460))

* Chores
  * fix molecules and sample with faulty molfiles  ([#2431](https://github.com/ComPlat/chemotion_ELN/pull/2431))
  * update service dependencies  ([#2452](https://github.com/ComPlat/chemotion_ELN/pull/2452))
  * Bump http-proxy-middleware from 2.0.7 to 2.0.9  ([#2454](https://github.com/ComPlat/chemotion_ELN/pull/2454))
  * remove unused endpoint  ([#2464](https://github.com/ComPlat/chemotion_ELN/pull/2464))
  * miscellaneous db/schema - annotation - bump minor node  ([#2485](https://github.com/ComPlat/chemotion_ELN/pull/2485))

* Build
  * set schema format to sql for test env  ([#2401](https://github.com/ComPlat/chemotion_ELN/pull/2401))
  * update postgres client to 16  ([#2403](https://github.com/ComPlat/chemotion_ELN/pull/2403))

## [v2.0.0-rc2]
> (2025-03-27)

* Features and enhancements
  * inventory label reset  ([#2367](https://github.com/ComPlat/chemotion_ELN/pull/2367))
  * device description adjustments  ([#2395](https://github.com/ComPlat/chemotion_ELN/pull/2395))
  * labimotion 2.0.0  ([#2418](https://github.com/ComPlat/chemotion_ELN/pull/2418))
  * user-selectable columns for reaction variations table  ([#2364](https://github.com/ComPlat/chemotion_ELN/pull/2364))
  * persist layout of reaction variations  ([#2419](https://github.com/ComPlat/chemotion_ELN/pull/2419))

* Bug fixes

  UX/UI
  * blank page on dropping research plan into a screen  ([#2352](https://github.com/ComPlat/chemotion_ELN/pull/2352))
  * value of Select input from Sample molecule name and report template  ([#2369](https://github.com/ComPlat/chemotion_ELN/pull/2369))
  * improve unit switch behavior for reaction scheme gase phase inputs  ([#2396](https://github.com/ComPlat/chemotion_ELN/pull/2396))
  * purification selection in Reaction - function length typo  ([#2415](https://github.com/ComPlat/chemotion_ELN/pull/2415))
  * notifications rendered out of modal when too many.  ([#2392](https://github.com/ComPlat/chemotion_ELN/pull/2392))
  * import action in import chemicals modal  ([#2414](https://github.com/ComPlat/chemotion_ELN/pull/2414))
  * limit initialize when copy sample  ([#2350](https://github.com/ComPlat/chemotion_ELN/pull/2350))
  * device command page blank  ([#2366](https://github.com/ComPlat/chemotion_ELN/pull/2366))
  * enabling rdkit  ([#2361](https://github.com/ComPlat/chemotion_ELN/pull/2361))
  * rdkit structure query   ([#2372](https://github.com/ComPlat/chemotion_ELN/pull/2372))
  * reset real masses on copy reaction  ([#2349](https://github.com/ComPlat/chemotion_ELN/pull/2349))
  * the lock equiv. not working  ([#2312](https://github.com/ComPlat/chemotion_ELN/pull/2312))
  * import well-plate readouts w some templates - import button missing  ([#2358](https://github.com/ComPlat/chemotion_ELN/pull/2358))
  * scroll reaction long description  ([#2376](https://github.com/ComPlat/chemotion_ELN/pull/2376))
  * tab layout setting per collection  ([#2382](https://github.com/ComPlat/chemotion_ELN/pull/2382))
  * generating report for gas scheme reaction  ([#2390](https://github.com/ComPlat/chemotion_ELN/pull/2390))
  * element list (un)collapse of sample group  ([#2362](https://github.com/ComPlat/chemotion_ELN/pull/2362))
  * blank page on requesting unauthorized files for nmrium  ([#2387](https://github.com/ComPlat/chemotion_ELN/pull/2387))
  * disabled drag-and-drop handle for list samples and molecules to reaction scheme  ([#2400](https://github.com/ComPlat/chemotion_ELN/pull/2400))
  * messaging user for incoming files from datacollector device  ([#2404](https://github.com/ComPlat/chemotion_ELN/pull/2404))
  * silent network error on affiliation deletion api call  ([#2407](https://github.com/ComPlat/chemotion_ELN/pull/2407))
  * pdf-reader for analysis preview  ([#2386](https://github.com/ComPlat/chemotion_ELN/pull/2386))
  * permission on cellline-materials: add index and created_by column  ([#2353](https://github.com/ComPlat/chemotion_ELN/pull/2353))
  * selecting all pages with advanced/detail search corrected  ([#2282](https://github.com/ComPlat/chemotion_ELN/pull/2282))
  * Limit maximum SampleTaskInbox height  ([#2416](https://github.com/ComPlat/chemotion_ELN/pull/2416))
  * drag-n-drop with touch and mouse event  ([#2398](https://github.com/ComPlat/chemotion_ELN/pull/2398))
  * drag inbox file item on analysis having no dataset  ([#2420](https://github.com/ComPlat/chemotion_ELN/pull/2420))

* Styles

  UX/UI
  * standardize capitalization for section titles  ([#2394](https://github.com/ComPlat/chemotion_ELN/pull/2394))

* Code refactoring
  * generic device description klass migration  ([#2397](https://github.com/ComPlat/chemotion_ELN/pull/2397))
  * deprecate rdkit-gem in favor of using rdkit cartridge  ([#2417](https://github.com/ComPlat/chemotion_ELN/pull/2417))

* Chores
  * bump labimotion-2.0.0  ([#2348](https://github.com/ComPlat/chemotion_ELN/pull/2348))
  * bump packages for @babel and test   ([#2355](https://github.com/ComPlat/chemotion_ELN/pull/2355))
  * bump nodejs from 18.20.6 to latest LTS 22.14  ([#2328](https://github.com/ComPlat/chemotion_ELN/pull/2328))
  * bump labimotion-2.0.0 rc  ([#2360](https://github.com/ComPlat/chemotion_ELN/pull/2360))
  * Bumps rails-html-sanitizer from 1.6.0 to 1.6.2  ([#2294](https://github.com/ComPlat/chemotion_ELN/pull/2294))
  * Bump rack from 2.2.11 to 2.2.12  ([#2370](https://github.com/ComPlat/chemotion_ELN/pull/2370))
  * Bump rack from 2.2.12 to 2.2.13  ([#2377](https://github.com/ComPlat/chemotion_ELN/pull/2377))
  * update chemical inventory msds mapper  ([#2318](https://github.com/ComPlat/chemotion_ELN/pull/2318))
  * bump @complat/chemotion-converter-app from 0.12.0 to 0.13.0  ([#2379](https://github.com/ComPlat/chemotion_ELN/pull/2379))
  * Bump @babel/runtime from 7.26.7 to 7.26.10  ([#2384](https://github.com/ComPlat/chemotion_ELN/pull/2384))
  * Bump graphql from 2.1.13 to 2.1.15  ([#2389](https://github.com/ComPlat/chemotion_ELN/pull/2389))
  * Bump @babel/helpers from 7.20.1 to 7.26.10  ([#2385](https://github.com/ComPlat/chemotion_ELN/pull/2385))
  * Bump canvg from 3.0.10 to 3.0.11  ([#2393](https://github.com/ComPlat/chemotion_ELN/pull/2393))
  * update Content Security Policy directives  ([#2399](https://github.com/ComPlat/chemotion_ELN/pull/2399))
  * bump chemspectra-app requirement  ([#2409](https://github.com/ComPlat/chemotion_ELN/pull/2409))
  * dependencies bump - minor and patch   ([#2422](https://github.com/ComPlat/chemotion_ELN/pull/2422))
  * bump spectra-app and ketcher2 requirements  ([#2424](https://github.com/ComPlat/chemotion_ELN/pull/2424))

* Ci
  * simplify db setup for github action  ([#2365](https://github.com/ComPlat/chemotion_ELN/pull/2365))
## [v2.0.0-rc1]
> (2025-02-25)

* Features and enhancements
  * labimotion-2.0.0  ([#2261](https://github.com/ComPlat/chemotion_ELN/pull/2261))
  * device description - a new element for user to define a device set up  ([#2281](https://github.com/ComPlat/chemotion_ELN/pull/2281))
  * advanced search for analyses datasets  ([#2179](https://github.com/ComPlat/chemotion_ELN/pull/2179))
  * sample conversion rate (%) in a reaction scheme  ([#2159](https://github.com/ComPlat/chemotion_ELN/pull/2159))
  * cell line -split/copy  ([#2276](https://github.com/ComPlat/chemotion_ELN/pull/2276))
  * import samples - additional attributes  ([#2214](https://github.com/ComPlat/chemotion_ELN/pull/2214))
  * expiration date and storage temperature fields in inventory  ([#2152](https://github.com/ComPlat/chemotion_ELN/pull/2152))
  * sample inventory label tag in sample list  ([#2222](https://github.com/ComPlat/chemotion_ELN/pull/2222))
  * substructure search with RDKIT postgres extension  ([#2055](https://github.com/ComPlat/chemotion_ELN/pull/2055))
  * general comment field to analysis section of any element ([#2241](https://github.com/ComPlat/chemotion_ELN/pull/2241))
  * Gas Scheme" feature in reaction variations table ([#2250](https://github.com/ComPlat/chemotion_ELN/pull/2250))
  * data change history tracker([#2068](https://github.com/ComPlat/chemotion_ELN/pull/2068))
  * user storage space ([#2274](htts://github.com/ComPlat/chemotion_ELN/pull/2274))
  * sample SVG rendering service to use indigo ([#2051](https://github.com/ComPlat/chemotion_ELN/pull/2051))
  * tagging with user defined labels of screen well-plate and research plan ([#2231](https://github.com/ComPlat/chemotion_ELN/pull/2231))
 

* Bug fixes
  * quill editor and other warnings  ([#2218](https://github.com/ComPlat/chemotion_ELN/pull/2218))
  * bootstrap styles  ([#2225](https://github.com/ComPlat/chemotion_ELN/pull/2225))
  * skip uploading new but discarded attachments  ([#2251](https://github.com/ComPlat/chemotion_ELN/pull/2251))
  * reaction report generation for gas products when the vessel size is not given  ([#2254](https://github.com/ComPlat/chemotion_ELN/pull/2254))
  * matrice sequence  ([#2257](https://github.com/ComPlat/chemotion_ELN/pull/2257))
  * allow multiple delayed_job named-queue pools in the worker container  ([#2258](https://github.com/ComPlat/chemotion_ELN/pull/2258))
  * Reaction Variations: Update variations' sample IDs when reaction is copied  ([#2265](https://github.com/ComPlat/chemotion_ELN/pull/2265))
  * allow header for yield/equiv. column in reaction scheme for shared collections with read only rights  ([#2271](https://github.com/ComPlat/chemotion_ELN/pull/2271))
  * creating molecules with invalid molfile using faulty smiles  ([#2255](https://github.com/ComPlat/chemotion_ELN/pull/2255))

  ChemSpectra and NMRIUM
  * bump service chem-spectra-app to v.1.2.4  ([#2253](https://github.com/ComPlat/chemotion_ELN/pull/2253))
  * display exact mass instead of theoretical mass  ([#2298](https://github.com/ComPlat/chemotion_ELN/pull/2298))

  UX/UI
  * reaction variations table style and appearance   ([#2285](https://github.com/ComPlat/chemotion_ELN/pull/2285))
  * color-coding of save-status in reaction detail card  ([#2306](https://github.com/ComPlat/chemotion_ELN/pull/2306))
  * Display short label on reaction scheme hover  ([#2310](https://github.com/ComPlat/chemotion_ELN/pull/2310))

* Documentation
  * update changelog 1.10. with links to chemotion.net docs  ([#2289](https://github.com/ComPlat/chemotion_ELN/pull/2289))

* Styles

  UX/UI
  * correct formatting of a sample molarity added to the description of a reaction  ([#2315](https://github.com/ComPlat/chemotion_ELN/pull/2315))
  * rubocop app/models/sample.rb  ([#2325](https://github.com/ComPlat/chemotion_ELN/pull/2325))

* Code refactoring
  * update react-bootstrap library  ([#1930](https://github.com/ComPlat/chemotion_ELN/pull/1930))
  * Remove UNSAFE_ react lifecycle hooks  ([#2196](https://github.com/ComPlat/chemotion_ELN/pull/2196))
  * datacollector  ([#2240](https://github.com/ComPlat/chemotion_ELN/pull/2240))
  * track file causing errors through file cache rather db  ([#2267](https://github.com/ComPlat/chemotion_ELN/pull/2267))
  * migrate to shakapacker  ([#2236](https://github.com/ComPlat/chemotion_ELN/pull/2236))

  UX/UI
  * Rearrange the order of elemental composition  ([#2305](https://github.com/ComPlat/chemotion_ELN/pull/2305))

* Chores
  * Bump actionmailer from 6.1.7.8 to 6.1.7.9  ([#2221](https://github.com/ComPlat/chemotion_ELN/pull/2221))
  * Bump actionpack from 6.1.7.8 to 6.1.7.9  ([#2220](https://github.com/ComPlat/chemotion_ELN/pull/2220))
  * Bump actiontext from 6.1.7.8 to 6.1.7.9  ([#2219](https://github.com/ComPlat/chemotion_ELN/pull/2219))
  * Remove unused/obsolete dependencies and code, render fewer HTML tags  ([#2223](https://github.com/ComPlat/chemotion_ELN/pull/2223))
  * Bump http-proxy-middleware from 2.0.4 to 2.0.7  ([#2229](https://github.com/ComPlat/chemotion_ELN/pull/2229))
  * Bump rexml from 3.3.6 to 3.3.9  ([#2231](https://github.com/ComPlat/chemotion_ELN/pull/2231))
  * Minor fixes & improvements  ([#2232](https://github.com/ComPlat/chemotion_ELN/pull/2232))
  * Bump labimotion from 1.4.0.2 to 1.4.1  ([#2228](https://github.com/ComPlat/chemotion_ELN/pull/2228))
  * upd Gemfile.lock and model annotation  ([#2269](https://github.com/ComPlat/chemotion_ELN/pull/2269))
  * proper .service-dependencies spectra tag name  ([#2270](https://github.com/ComPlat/chemotion_ELN/pull/2270))
  * Bump cross-spawn from 7.0.3 to 7.0.6  ([#2243](https://github.com/ComPlat/chemotion_ELN/pull/2243))
  * bump github action for test coverage - lcov report (#2317)  ([#2317](https://github.com/ComPlat/chemotion_ELN/pull/2317))
  * Bump net-imap from 0.4.17 to 0.4.19  ([#2323](https://github.com/ComPlat/chemotion_ELN/pull/2323))

* Build
  * Add missing jq package in docker dev env  ([#2278](https://github.com/ComPlat/chemotion_ELN/pull/2278))
  * fix shakpacker config for the webpack-dev-server   ([#2280](https://github.com/ComPlat/chemotion_ELN/pull/2280))
  * option for setting service image and volume names  ([#2288](https://github.com/ComPlat/chemotion_ELN/pull/2288))

* Ci
  * fix asset compilation testing workflow  ([#2268](https://github.com/ComPlat/chemotion_ELN/pull/2268))


## [v1.10.5]
> (2024-12-16)

### Code refactoring
  * datacollector: track file causing errors through file cache rather db ([#2267](https://github.com/ComPlat/chemotion_ELN/pull/2267))

## [v1.10.4]
> (2024-12-09)

### Bug fixes

  * skip uploading new but discarded attachments  ([#2251](https://github.com/ComPlat/chemotion_ELN/pull/2251))
  * reaction report generation for gas products when the vessel size is not given  ([#2254](https://github.com/ComPlat/chemotion_ELN/pull/2254))
  * selecting all pages with advanced/detail search corrected  ([#2215](https://github.com/ComPlat/chemotion_ELN/pull/2215))
  * allow multiple delayed_job named-queue pools in the worker container  ([#2258](https://github.com/ComPlat/chemotion_ELN/pull/2258))
  * ELN upgrade: correct matrice sequence  ([#2257](https://github.com/ComPlat/chemotion_ELN/pull/2257))

  ChemSpectra and NMRIUM
  * bump service chem-spectra-app to v.1.2.4  ([#2253](https://github.com/ComPlat/chemotion_ELN/pull/2253))

### Code refactoring
  * datacollector  ([#2240](https://github.com/ComPlat/chemotion_ELN/pull/2240))

### Chores
  * Bump actionmailer from 6.1.7.8 to 6.1.7.9  ([#2221](https://github.com/ComPlat/chemotion_ELN/pull/2221))
  * Bump actionpack from 6.1.7.8 to 6.1.7.9  ([#2220](https://github.com/ComPlat/chemotion_ELN/pull/2220))
  * Bump actiontext from 6.1.7.8 to 6.1.7.9  ([#2219](https://github.com/ComPlat/chemotion_ELN/pull/2219))
  * Bump rexml from 3.3.6 to 3.3.9  ([#2231](https://github.com/ComPlat/chemotion_ELN/pull/2231))
  * Bump labimotion from 1.4.0.2 to 1.4.1  ([#2228](https://github.com/ComPlat/chemotion_ELN/pull/2228))

## [v1.10.3]
> (2024-10-02)

### Bug fixes
  * wellplate template download  ([#2115](https://github.com/ComPlat/chemotion_ELN/pull/2115))
  * oidc params issue  ([#2190](https://github.com/ComPlat/chemotion_ELN/pull/2190))
  * admin restore account - rm obsolete has_profile calls  ([#2181](https://github.com/ComPlat/chemotion_ELN/pull/2181))
  * returning attachment preview when not annotated  ([#2192](https://github.com/ComPlat/chemotion_ELN/pull/2192))
  * type error when sample has no collection tag data on saving sample  ([#2158](https://github.com/ComPlat/chemotion_ELN/pull/2158))

#### ChemSpectra and NMRIUM
  * internal ref for cv layout  ([#2104](https://github.com/ComPlat/chemotion_ELN/pull/2104))

#### UX/UI
  * reaction scheme - sample names style  ([#2193](https://github.com/ComPlat/chemotion_ELN/pull/2193))

### Chores
  * Bump express from 4.19.2 to 4.21.0  ([#2154](https://github.com/ComPlat/chemotion_ELN/pull/2154))
  * Bump dompurify from 2.4.1 to 2.5.6  ([#2157](https://github.com/ComPlat/chemotion_ELN/pull/2157))
  * bump converter-client 0.11.0  ([#2171](https://github.com/ComPlat/chemotion_ELN/pull/2171))
  * Bump puma from 5.6.8 to 5.6.9  ([#2168](https://github.com/ComPlat/chemotion_ELN/pull/2168))

### CI
  * set postgres to latest 16 for testing  ([#2191](https://github.com/ComPlat/chemotion_ELN/pull/2191))

## [v1.10.2]
> (2024-09-13)

### Bug fixes
  * save research plan inside screen  ([#2107](https://github.com/ComPlat/chemotion_ELN/pull/2107))
  * element filter when selecting ui-state  ([#2145](https://github.com/ComPlat/chemotion_ELN/pull/2145))
  * proper link format for the url handler app  ([#2147](https://github.com/ComPlat/chemotion_ELN/pull/2147))

### Code refactoring
  * asset pipeline to prepare for bootstrap update  ([#2139](https://github.com/ComPlat/chemotion_ELN/pull/2139))

### Chores
  * Bump webpack from 5.93.0 to 5.94.0  ([#2106](https://github.com/ComPlat/chemotion_ELN/pull/2106))
  * Bump rexml from 3.3.5 to 3.3.6  ([#2099](https://github.com/ComPlat/chemotion_ELN/pull/2099))
  * Bump recommended versions for nmrium-wrapper (0.8.0) and converter-app (1.3.0)  ([#2153](https://github.com/ComPlat/chemotion_ELN/pull/2153))

## [v1.10.1]
> (2024-09-06)

### Features and enhancements
  * Ketcher2 [:books: docs](https://chemotion.net/docs/services/ketcher2)
    * Common Templates, User Templates & User settings ([#2061](https://github.com/ComPlat/chemotion_ELN/pull/2061))
    * collect metadata other solvent for cv ([#2121](https://github.com/ComPlat/chemotion_ELN/pull/2121))
    * search common templates in Ketcher2 ([#2127](https://github.com/ComPlat/chemotion_ELN/pull/2127))
  * Structure viewer ([#2098](https://github.com/ComPlat/chemotion_ELN/pull/2098)) [:books: docs](https://chemotion.net/docs/repo/viewer)

#### UX/UI
  * Reaction UI enhancements ([#2100](https://github.com/ComPlat/chemotion_ELN/pull/2100))
  * Sample layout UI enhancements ([#2111](https://github.com/ComPlat/chemotion_ELN/pull/2111))
  * Sample properties UI changes ([#2116](https://github.com/ComPlat/chemotion_ELN/pull/2116))
  * affiliations-change color of the save button and add required placeholder  ([#2137](https://github.com/ComPlat/chemotion_ELN/pull/2137))
  * display toggle button for default/gaseous scheme only in reaction scheme tab ([#2136](https://github.com/ComPlat/chemotion_ELN/pull/2136))
  * align style of the analysis section ([#2102](https://github.com/ComPlat/chemotion_ELN/pull/2102))

### Bug fixes
  * missing other internal ref for CV ([#2110](https://github.com/ComPlat/chemotion_ELN/pull/2110))
  * ketcher-options fetching on load ([#2113](https://github.com/ComPlat/chemotion_ELN/pull/2113))
  * handle binary response for viewer ([#2114](https://github.com/ComPlat/chemotion_ELN/pull/2114))
  * restore user label ([#2101](https://github.com/ComPlat/chemotion_ELN/pull/2101))
  * cannot get scan rate from metadata  ([#2120](https://github.com/ComPlat/chemotion_ELN/pull/2120))
  * handle empty input for viewer ([#2105](https://github.com/ComPlat/chemotion_ELN/pull/2105))
  * truncate sample name for reactant materials in reaction scheme  ([#2125](https://github.com/ComPlat/chemotion_ELN/pull/2125))
  * handling empty sample names during truncation  ([#2126](https://github.com/ComPlat/chemotion_ELN/pull/2126))
  * restore old density-molarity styling  ([#2134](https://github.com/ComPlat/chemotion_ELN/pull/2134))
  * disable dataset metadata search  ([#2129](https://github.com/ComPlat/chemotion_ELN/pull/2129))
  * user template duplicate tab crash  ([#2131](https://github.com/ComPlat/chemotion_ELN/pull/2131))
  * duplicate attachments in analyses  ([#2130](https://github.com/ComPlat/chemotion_ELN/pull/2130))
  * coefficient is set to null due to missing coefficient parameter  ([#2135](https://github.com/ComPlat/chemotion_ELN/pull/2135))
  * profile test case fail  ([#2132](https://github.com/ComPlat/chemotion_ELN/pull/2132))
  * upload attachment error  ([#2133](https://github.com/ComPlat/chemotion_ELN/pull/2133))


## [v1.10.0]
> (2024-08-22)

### Features and enhancements
  * flexibilising the size of wellplates  ([#1721](https://github.com/ComPlat/chemotion_ELN/pull/1721)) [:books: docs](https://chemotion.net/docs/eln/ui/elements/wellplates?#adjust-the-size-of-a-wellplate)
  * LabIMotion 1.4.0  ([#2070](https://github.com/ComPlat/chemotion_ELN/pull/2070)) [:books: docs](https://chemotion.net/docs/labimotion)
  * Reaction variations  [:books: docs](https://chemotion.net/docs/eln/ui/details#variations-tab)
    * analyses  ([#1870](https://github.com/ComPlat/chemotion_ELN/pull/1870))
    * UI updates  ([#2074](https://github.com/ComPlat/chemotion_ELN/pull/2074))
    * allow comma and period as decimal separators ([#1959](https://github.com/ComPlat/chemotion_ELN/pull/1959)) 
    * add `Notes` column  ([#1966](https://github.com/ComPlat/chemotion_ELN/pull/1966))
    * enable editing of amount (mol) ([#1980](https://github.com/ComPlat/chemotion_ELN/pull/1980))
  * standard report of reaction observations field to keep paragraph structure  ([#1951](https://github.com/ComPlat/chemotion_ELN/pull/1951))
  * add vessel size property to reaction  ([#2017](https://github.com/ComPlat/chemotion_ELN/pull/2017)) [:books: docs](https://chemotion.net/docs/eln/ui/elements/reactions?#User%20Interface%20Functionality)
  * Barcode Datamatrix printing configuration: [:books: docs](https://chemotion.net/docs/eln/install_configure/configuration#configuring-pdf-layouts-for-qr-codes-barcode-and-datamatrix-stickers)
    * customizable code type, layout, label options, and molecule display for PDF output  ([#2018](https://github.com/ComPlat/chemotion_ELN/pull/2018))
    * multiple print-code config  ([#2085](https://github.com/ComPlat/chemotion_ELN/pull/2085))
  * decoupled samples molecular mass determined from sum formula  ([#1893](https://github.com/ComPlat/chemotion_ELN/pull/1893))
  * add analyses datasets to search  ([#2089](https://github.com/ComPlat/chemotion_ELN/pull/2089))
  * Third party apps  ([#1832](https://github.com/ComPlat/chemotion_ELN/pull/1832)) [:books: docs](https://chemotion.net/docs/eln/admin/third_party_apps)
  * Gas phase reaction scheme  ([#1933](https://github.com/ComPlat/chemotion_ELN/pull/1933)) [:books: docs](https://chemotion.net/docs/eln/ui/elements/reactions#gas-phase-reaction-scheme)
  * ChemLocalLink: chemotion url handler integration  ([#1972](https://github.com/ComPlat/chemotion_ELN/pull/1972)) [:books: docs](https://chemotion.net/docs/services/chemlocallink)
  * admin api to trigger recommended ket2 installation  ([#2095](https://github.com/ComPlat/chemotion_ELN/pull/2095))
  * vnc page - add option to fit display width  ([#2003](https://github.com/ComPlat/chemotion_ELN/pull/2003))

#### UX/UI
  * flexibilising the size of wellplates  ([#1814](https://github.com/ComPlat/chemotion_ELN/pull/1814))
  * Sample properties UI layout rework  ([#2066](https://github.com/ComPlat/chemotion_ELN/pull/2066))

#### ChemSpectra and NMRIUM
  * process and display DSC layout  ([#1965](https://github.com/ComPlat/chemotion_ELN/pull/1965)) [:books: docs](https://chemotion.net/docs/services/chemspectra)
  * update chemspectra-app to handle GC layout  ([#2039](https://github.com/ComPlat/chemotion_ELN/pull/2039))
  * add shift function for CV layout and new preview image for NMR  ([#1808](https://github.com/ComPlat/chemotion_ELN/pull/1808))
  * update chemspectra app@1.1.2 editor@1.2.2  ([#1926](https://github.com/ComPlat/chemotion_ELN/pull/1926))

### Bug fixes
  * viewing of pdf in analysis preview  ([#1917](https://github.com/ComPlat/chemotion_ELN/pull/1917))
  * broken gem rinchi  ([#1936](https://github.com/ComPlat/chemotion_ELN/pull/1936))
  * add default value for citationMap  ([#1932](https://github.com/ComPlat/chemotion_ELN/pull/1932))
  * wellplate  ([#1938](https://github.com/ComPlat/chemotion_ELN/pull/1938))
  * profile_api  ([#1944](https://github.com/ComPlat/chemotion_ELN/pull/1944))
  * Add root container to seeded reactions  ([#1947](https://github.com/ComPlat/chemotion_ELN/pull/1947))
  * remove redundant json file in CV layout  ([#1935](https://github.com/ComPlat/chemotion_ELN/pull/1935))
  * limit welcome email attempts  ([#1937](https://github.com/ComPlat/chemotion_ELN/pull/1937))
  * email address validation for longer TLD and reset message on close ...  ([#1958](https://github.com/ComPlat/chemotion_ELN/pull/1958))
  * device seed  ([#1945](https://github.com/ComPlat/chemotion_ELN/pull/1945))
  * coefficient display value defaults to 1  ([#1967](https://github.com/ComPlat/chemotion_ELN/pull/1967))
  * element list scrollbar back to the top after page change  ([#1964](https://github.com/ComPlat/chemotion_ELN/pull/1964))
  * attachment permission validation to allow access on shared items  ([#1973](https://github.com/ComPlat/chemotion_ELN/pull/1973))
  * dataset thumbnail image to match magnified preview when annotated  ([#1978](https://github.com/ComPlat/chemotion_ELN/pull/1978))
  * Ketcher2 iframe: load molfile when editor ready  ([#1983](https://github.com/ComPlat/chemotion_ELN/pull/1983))
  * admin api to restore missing locked collection  ([#2001](https://github.com/ComPlat/chemotion_ELN/pull/2001))
  * skip empty well initialization on existing wellplate  ([#2020](https://github.com/ComPlat/chemotion_ELN/pull/2020))
  * Show save-status of reaction variations table  ([#2007](https://github.com/ComPlat/chemotion_ELN/pull/2007))
  * Reaction variations migration  ([#2008](https://github.com/ComPlat/chemotion_ELN/pull/2008))
  * match DCM suggestion in solvent-reagent dropdown   ([#2028](https://github.com/ComPlat/chemotion_ELN/pull/2028))
  * Restrict enabling disabled fields on double click  ([#1434](https://github.com/ComPlat/chemotion_ELN/pull/1434))
  * sassc undefined operation on compiling ag-grid scss  ([#2033](https://github.com/ComPlat/chemotion_ELN/pull/2033))
  * use of obsolete method for text_templates  ([#2071](https://github.com/ComPlat/chemotion_ELN/pull/2071))

#### Admin
  * datacollector connection sftp check when port given  ([#2049](https://github.com/ComPlat/chemotion_ELN/pull/2049))

### Code refactoring
  * BREAKING CHANGE: device as a distinct model from user  ([#1736](https://github.com/ComPlat/chemotion_ELN/pull/1736))
  * reaction variations components  ([#1946](https://github.com/ComPlat/chemotion_ELN/pull/1946))
  * generalise initializers:  ketcher_service structure_editors  ([#1960](https://github.com/ComPlat/chemotion_ELN/pull/1960))
  * reaction variations table db migration  ([#1987](https://github.com/ComPlat/chemotion_ELN/pull/1987))
  * finding the proper CollectionsElement model  through reflection  ([#1915](https://github.com/ComPlat/chemotion_ELN/pull/1915))
  * move inline annotation for cyclic voltammetry layout to ELN helper  ([#1956](https://github.com/ComPlat/chemotion_ELN/pull/1956))
  * auto inventory label assignment  ([#1818](https://github.com/ComPlat/chemotion_ELN/pull/1818))
  * fetch chemical phrases methods for merck  ([#2092](https://github.com/ComPlat/chemotion_ELN/pull/2092))
  * affiliations page  ([#1957](https://github.com/ComPlat/chemotion_ELN/pull/1957))

### Tests
  * fix well position formating  ([#1884](https://github.com/ComPlat/chemotion_ELN/pull/1884))
  * fix flaky job test  ([#1939](https://github.com/ComPlat/chemotion_ELN/pull/1939))
  * fix flaky tests in chemical_api_spec (webmock)  ([#2060](https://github.com/ComPlat/chemotion_ELN/pull/2060))

### Chores
  * Bump rexml from 3.2.5 to 3.2.8  ([#1924](https://github.com/ComPlat/chemotion_ELN/pull/1924))
  * Remove `Chrome` from devcontainer  ([#1942](https://github.com/ComPlat/chemotion_ELN/pull/1942))
  * Bump rack-contrib from 2.3.0 to 2.5.0  ([#1954](https://github.com/ComPlat/chemotion_ELN/pull/1954))
  * dep update antd js  ([#1530](https://github.com/ComPlat/chemotion_ELN/pull/1530))
  * Bump actionpack from 6.1.7.7 to 6.1.7.8  ([#1962](https://github.com/ComPlat/chemotion_ELN/pull/1962))
  * Bump ws from 8.13.0 to 8.17.1  ([#1977](https://github.com/ComPlat/chemotion_ELN/pull/1977))
  * update db schema - model annotations  ([#2014](https://github.com/ComPlat/chemotion_ELN/pull/2014))
  * Bump ag-grid-community from 31.0.3 to 32.0.1  ([#2021](https://github.com/ComPlat/chemotion_ELN/pull/2021))
  * rm deused chemscanner and unused  js dep  ([#1981](https://github.com/ComPlat/chemotion_ELN/pull/1981))
  * Bump fugit from 1.11.0 to 1.11.1  ([#2088](https://github.com/ComPlat/chemotion_ELN/pull/2088))
  * bundle update / rm deused capistrano  ([#2090](https://github.com/ComPlat/chemotion_ELN/pull/2090))
  * upgrade node package react-datepicker  ([#2093](https://github.com/ComPlat/chemotion_ELN/pull/2093))

### Build
  * fetch assets, or source code to build assets, of ketcher2  ([#2044](https://github.com/ComPlat/chemotion_ELN/pull/2044))

### CI
  * relax nodejs version - update runner docker  ([#1934](https://github.com/ComPlat/chemotion_ELN/pull/1934))

## [v1.9.3]
> (2024-05-13)

* Features and enhancements
  * structure editor compatibility  ([#1894](https://github.com/ComPlat/chemotion_ELN/pull/1894))
  * enable spectra report for samples  ([#1902](https://github.com/ComPlat/chemotion_ELN/pull/1902))
  * activate segment visibility field in generic elements  ([#1702](https://github.com/ComPlat/chemotion_ELN/pull/1702))

* Bug fixes
  * advanced search  ([#1888](https://github.com/ComPlat/chemotion_ELN/pull/1888))
  * converter inbox issue for NMR  ([#1903](https://github.com/ComPlat/chemotion_ELN/pull/1903))
  * add updating of annotations also in reaction container  ([#1913](https://github.com/ComPlat/chemotion_ELN/pull/1913))
  * Yield calculation with purity  ([#1904](https://github.com/ComPlat/chemotion_ELN/pull/1904))
  * ensure wait_until is set when initializing cron delayed jobs ([#1892](https://github.com/ComPlat/chemotion_ELN/pull/1892))

* Chores
  * Bump react-pdf from 5.7.0 to 7.7.3  ([#1909](https://github.com/ComPlat/chemotion_ELN/pull/1909))

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

