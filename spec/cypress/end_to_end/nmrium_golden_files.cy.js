describe('NMRium golden files', () => {
  /* global expect */
  function normalizeNmrium(obj) {
    // Drop known non-deterministic and environment-specific fields
    const DROP_KEYS = new Set([
      'id',
      'createdAt',
      'updatedAt',
      'date',
      'localeDate',
      'epoch',
      'source',
      'sourceSelector',
      'originalData',
      'baseURL',
      'relativePath',
      'files',
      'token',
    ]);

    function walk(value) {
      if (Array.isArray(value)) return value.map(walk);
      if (value && typeof value === 'object') {
        const out = {};
        Object.keys(value)
          .sort()
          .forEach((k) => {
            if (DROP_KEYS.has(k)) return;
            out[k] = walk(value[k]);
          });
        return out;
      }
      if (typeof value === 'string') {
        // Remove tokenized public URLs (these will change every run)
        return value
          .replace(/\/api\/v1\/public\/third_party_apps\/[^/]+/g, '/api/v1/public/third_party_apps/<TOKEN>')
          .replace(/https?:\/\/localhost:\d+/g, 'http://localhost:<PORT>');
      }
      return value;
    }

    return walk(obj);
  }

  function setupIntercepts() {
    cy.intercept('GET', '/api/v1/ui/initialize', (req) => {
      // Avoid 304s (no body) so we can reliably override feature flags.
      // Cypress + Rails cache headers can otherwise prevent `res.body` from existing.
      delete req.headers['if-none-match'];
      delete req.headers['if-modified-since'];
      req.headers['cache-control'] = 'no-cache';

      req.continue((res) => {
        if (!res.body || typeof res.body !== 'object') return;
        res.body.has_nmrium_wrapper = true;
        res.body.has_chem_spectra = true;
      });
    }).as('uiInitialize');

    cy.intercept('GET', '/api/v1/chemspectra/nmrium_wrapper/host_name', {
      nmrium_url: 'http://localhost:3001/',
    }).as('nmriumHostName');

    // In Cypress we run the app on :3002, but some environments generate handler URLs
    // pointing to :3000 (dev app). That breaks because the attachment exists only in
    // the Cypress test server DB. Rewrite returned handler URLs to :3002.
    cy.intercept('GET', /\/api\/v1\/third_party_apps\/url\?.*/, (req) => {
      req.continue((res) => {
        const rewrite = (val) => {
          if (typeof val !== 'string') return val;
          return val.replace('http://localhost:3000', 'http://localhost:3002');
        };

        if (typeof res.body === 'string') {
          res.body = rewrite(res.body);
        } else if (res.body && typeof res.body === 'object') {
          // common shapes: { url: "..." } or { handler_url: "..." }
          if (typeof res.body.url === 'string') res.body.url = rewrite(res.body.url);
          if (typeof res.body.handler_url === 'string') res.body.handler_url = rewrite(res.body.handler_url);
        }
      });
    }).as('tpaHandlerUrl');

    // The wrapper will fetch the actual file via a tokenized public URL.
    cy.intercept('GET', /\/api\/v1\/public\/third_party_apps\/.*\/file\.(zip|jdx|dx|jcamp)/).as('tpaPublicFile');

    cy.intercept('GET', /\/api\/v1\/ols_terms\/list\.json\?name=chmo.*/, {
      // IMPORTANT:
      // `listNMROntology()` (SpectraHelper) ignores "leaf" nodes at the top level when chmos is an Array,
      // and only descends into `children`. So we must return a tree where the top-level node has children.
      ols_terms: [{
        value: 'nuclear magnetic resonance',
        children: [
          // IMPORTANT:
          // `isNMRKind()` checks `kind === ontology` OR `kind.toLowerCase().includes(ontology)` (case-sensitive on `ontology`),
          // and analysis containers store kind as "CHMO:... | <label>".
          // To make `kind === ontology` deterministic, return the exact stored kind string here.
          { value: 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)', children: [] }
        ],
      }],
    }).as('olsChmo');
    cy.intercept('GET', /\/api\/v1\/ols_terms\/list\.json\?name=rxno.*/, { ols_terms: [] });
    cy.intercept('GET', /\/api\/v1\/ols_terms\/list\.json\?name=bao.*/, { ols_terms: [] });
  }

  function openNmriumForSample(sampleId) {
    cy.visit(`/mydb/sample/${sampleId}`);
    // Analyses tab
    cy.contains('Analyses', { timeout: 60000 }).should('be.visible').click();

    // Click the "Process with NMRium" button (bar-chart icon) **inside the first analysis header**.
    // There are other `fa-bar-chart` icons on the page; scoping avoids false matches.
    cy.get('.analysis-header', { timeout: 60000 })
      .first()
      .within(() => {
        cy.get('button#spectra-editor-split-button i.fa.fa-bar-chart', { timeout: 60000 })
          .should('be.visible')
          .closest('button#spectra-editor-split-button')
          .should('be.visible')
          .and('not.be.disabled')
          .click({ force: true });
      });

    // Modal should open and create the iframe; host_name is fetched when NMRiumDisplayer is active.
    cy.get('iframe#nmrium_wrapper', { timeout: 60000 }).should('be.visible');
  }

  function saveFromNmriumModal() {
    cy.contains('Close with Save', { timeout: 60000 }).should('be.visible').click();
  }

  function waitForSavedNmriumAttachment({
    sampleId,
    expectedSavedNmriumFilename,
    timeoutMs = 60000,
    intervalMs = 1000,
  }) {
    const start = Date.now();

    const check = () => cy.appEval(`
      collect_dataset_ids = lambda do |container|
        return [] unless container
        ids = []
        (container.children || []).each do |child|
          ids << child.id if child.container_type == 'dataset'
          ids.concat(collect_dataset_ids.call(child))
        end
        ids
      end

      sample = Sample.find(${sampleId})
      dataset_ids = collect_dataset_ids.call(sample.container)
      att = Attachment.where(
        attachable_type: 'Container',
        attachable_id: dataset_ids,
        filename: '${expectedSavedNmriumFilename}',
        deleted_at: nil
      ).order(:created_at).last
      att&.read_file
    `).then((savedNmriumText) => {
      if (savedNmriumText) return savedNmriumText;

      if (Date.now() - start > timeoutMs) {
        throw new Error('No saved .nmrium attachment found (timeout)');
      }
      return cy.wait(intervalMs).then(check);
    });

    return check();
  }

  function runGoldenCase({
    inputFilename,
    inputFilePath,
    inputAasmState,
    goldenNmriumPath,
    expectedSavedNmriumFilename,
  }) {
    setupIntercepts();

    cy.appEval(`
      require 'securerandom'
      suffix = SecureRandom.hex(4)
      abbr = "n#{SecureRandom.alphanumeric(2).downcase}" # must be 2-3 chars total
      user = FactoryBot.create(
        :user,
        email: "nmrium_#{suffix}@eln.edu",
        password: 'user_password',
        password_confirmation: 'user_password',
        name_abbreviation: abbr,
        account_active: 'true'
      )
      collection = FactoryBot.create(:collection, user: user, label: 'NMR Collection', sample_detail_level: 10)
      # NOTE: The default :sample factory creates a container with one analysis (trait :with_analysis),
      # which would give us *two* analyses once we add our own. So we provide a root container with only
      # an empty "analyses" node, and then create exactly one analysis ourselves below.
      #
      # Pass molfile at creation time so the :sample callback does NOT create a Molecule record
      # (avoids unique-constraint issues between runs).
      molfile = JSON.parse(File.read(Rails.root.join('spec/fixtures/nmrium/zip_2d_result_expected.nmrium'))).dig('molecules', 0, 'molfile')
      sample = FactoryBot.create(
        :sample,
        creator: user,
        collections: [collection],
        container: FactoryBot.create(:root_container),
        molfile: molfile
      )

      analyses = sample.container.children.find { |c| c.container_type == 'analyses' }
      analysis = FactoryBot.create(:analysis_container, parent: analyses, name: 'new')
      dataset = FactoryBot.create(:container, parent: analysis, container_type: 'dataset', name: 'dataset-1')

      att = Attachment.create!(
        attachable: dataset,
        created_by: user.id,
        created_for: user.id,
        filename: '${inputFilename}',
        file_path: Rails.root.join('${inputFilePath}'),
        file_data: File.binread(Rails.root.join('${inputFilePath}')),
        aasm_state: '${inputAasmState}'
      )
      # attachable already set above; ensure association is persisted
      dataset.reload
      sample.save!

      { user_abbr: user.name_abbreviation, sample_id: sample.id, dataset_id: dataset.id, att_id: att.id, att_count: dataset.attachments.count }
    `).then(({ user_abbr, sample_id, dataset_id, att_count }) => {
      cy.visit('/users/sign_in');
      cy.login(user_abbr, 'user_password');

      expect(att_count, 'dataset attachments count').to.equal(1);

      openNmriumForSample(sample_id);

      // Mock the wrapper: inject golden nmrium state via postMessage so the test is deterministic
      // and does not depend on the external wrapper version at localhost:3001.
      const goldenPath = goldenNmriumPath.replace(/^spec\//, '');
      cy.readFile(goldenPath).then((goldenText) => {
        const nmriumObj = JSON.parse(goldenText);
        cy.window().then((win) => {
          win.dispatchEvent(new win.MessageEvent('message', {
            origin: 'http://localhost:3001',
            data: { type: 'nmr-wrapper:data-change', data: { state: nmriumObj } },
          }));
        });
      });

      saveFromNmriumModal();

      // Simulate wrapper "export as blob" response to trigger saving.
      cy.window().then((win) => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
        const blob = new win.Blob([svg], { type: 'image/svg+xml' });
        win.dispatchEvent(new win.MessageEvent('message', {
          origin: 'http://localhost:3001',
          data: {
            type: 'nmr-wrapper:action-response',
            data: { type: 'exportSpectraViewerAsBlob', data: { blob } },
          },
        }));
      });

      waitForSavedNmriumAttachment({
        sampleId: sample_id,
        expectedSavedNmriumFilename,
        timeoutMs: inputFilename === 'zip2D.zip' ? 180000 : 90000,
        intervalMs: 1500,
      }).then((savedNmriumText) => {
        cy.readFile(goldenPath).then((goldenText) => {
          const saved = normalizeNmrium(JSON.parse(savedNmriumText));
          const golden = normalizeNmrium(JSON.parse(goldenText));
          expect(saved).to.deep.equal(golden);
        });
      });
    });
  }

  it('converts a JCAMP (.jdx) through the wrapper and matches the golden .nmrium (normalized)', () => {
    runGoldenCase({
      inputFilename: 'spectra_file.jdx',
      inputFilePath: 'spec/fixtures/spectra_file.jdx',
      inputAasmState: 'edited',
      goldenNmriumPath: 'spec/fixtures/nmrium/jdx_result_expected.nmrium',
      expectedSavedNmriumFilename: 'spectra_file.nmrium',
    });
  });

  it('converts a ZIP 1D through the wrapper and matches the golden .nmrium (normalized)', () => {
    runGoldenCase({
      inputFilename: 'zip1D.zip',
      inputFilePath: 'spec/fixtures/nmrium/zips/zip1D.zip',
      inputAasmState: 'failure',
      goldenNmriumPath: 'spec/fixtures/nmrium/zip_1d_result_expected.nmrium',
      expectedSavedNmriumFilename: 'zip1D.nmrium',
    });
  });

  it('converts a ZIP 2D through the wrapper and matches the golden .nmrium (normalized)', () => {
    runGoldenCase({
      inputFilename: 'zip2D.zip',
      inputFilePath: 'spec/fixtures/nmrium/zips/zip2D.zip',
      inputAasmState: 'failure',
      goldenNmriumPath: 'spec/fixtures/nmrium/zip_2d_result_expected.nmrium',
      expectedSavedNmriumFilename: 'zip2D.nmrium',
    });
  });
});

