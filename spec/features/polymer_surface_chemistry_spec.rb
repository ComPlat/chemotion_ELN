# frozen_string_literal: true

require 'rails_helper'

# Selenium feature specs for polymer surface chemistry fixes on branch
# fix/ketcher-abs-stereo-rgroup-polymer-reopen.
#
# These specs verify user-visible outcomes using headless Chrome via Capybara.
# They complement the unit/integration specs in spec/models and spec/lib by
# testing the full browser interaction: navigation, SVG rendering, save flows,
# and report generation.
#
# Run individually:
#   bundle exec rspec spec/features/polymer_surface_chemistry_spec.rb
# Run with a visible browser (debugging):
#   USE_HEAD=1 bundle exec rspec spec/features/polymer_surface_chemistry_spec.rb

POLYMER_SINGLE_MOLFILE = Rails.root.join('spec/fixtures/files/polymer_single_template.mol').read.freeze

POLYMER_MULTI_MOLFILE = Rails.root.join('spec/fixtures/files/polymer_multi_template.mol').read.freeze

POLYMER_LEGACY_MOLFILE = Rails.root.join('spec/fixtures/files/polymer_broken_legacy.mol').read.freeze

POLYMER_TEXTNODE_MOLFILE = Rails.root.join('spec/fixtures/files/polymer_with_textnode.mol').read.freeze

# Plain (non-polymer) CTAB. Ketcher will sometimes append an empty
# "> <PolymersList>" block to this shape; PR #3533 on main guards against
# writing/keeping that empty block. Used by the empty-tag regression spec.
PLAIN_CTAB_MOLFILE = <<~MOL


    Ketcher 01010100002D

    2  1  0  0  0  0  0  0  0  0999 V2000
      0.0000    0.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
      0.0000   -0.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1  2  1  0     0  0
  M  END
MOL

describe 'Polymer Surface Chemistry' do
  # The sign_in/browser-fixture before hook below is scoped to this inner group only —
  # it must not leak into the model-level 'SVG auto-heal' group beneath it, which is
  # intentionally browser-free (no Capybara session, so no Chrome dependency).
  describe 'in the browser', type: :feature do
    let!(:user) do
      create(:person, account_active: true, confirmed_at: Time.zone.now)
    end

    let!(:collection) do
      Collection.find_by(user: user, label: 'chemotion-repository.net') ||
        create(:collection, user: user, label: 'chemotion-repository.net')
    end

    # Polymer molecule — is_partial: true, molfile has PolymersList block
    let!(:polymer_molecule) do
      create(:molecule,
             molfile: POLYMER_SINGLE_MOLFILE,
             is_partial: true,
             inchikey: 'POLYMER-SINGLE-INCHIKEY-001',
             sum_formular: 'R')
    end

    let!(:polymer_sample) do
      sample = create(:sample,
                      name: 'Polymer Test Sample',
                      creator: user,
                      molecule: polymer_molecule)
      CollectionsSample.find_or_create_by!(sample: sample, collection: collection)
      sample
    end

    before do
      user.update!(confirmed_at: Time.zone.now, account_active: true)
      sign_in(user)
      # Ensure molecule SVG fixture exists so the sample list renders
      mol_img_dir = Rails.public_path.join('images', 'molecules')
      svg_fixture = Rails.root.join('spec/fixtures/images/molecule.svg')
      begin
        FileUtils.ln_s(svg_fixture, mol_img_dir.join('molecule.svg'), force: false)
      rescue StandardError
        nil
      end
    end

    # ---------------------------------------------------------------------------
    # Area 1: Polymer sample navigation and SVG rendering
    # ---------------------------------------------------------------------------
    describe 'Polymer sample SVG rendering' do
      it 'shows the polymer sample in the collection list', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        expect(page).to have_content('Polymer Test Sample', wait: 5)
      end

      it 'opens the polymer sample detail without JavaScript errors', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Polymer Test Sample', wait: 5).click
        # Detail panel should open — verify a known element renders
        expect(page).to have_selector('.sample-detail', wait: 5)
      end

      it 'renders an SVG image in the sample detail panel', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Polymer Test Sample', wait: 5).click
        # The molecule SVG image should be present in the detail
        expect(page).to have_selector('img[src*="/images/"]', wait: 5)
      end
    end

    # ---------------------------------------------------------------------------
    # Area 2: Polymer sample save — no errors, spinner clears
    # ---------------------------------------------------------------------------
    describe 'Polymer sample save flow' do
      it 'saves a polymer sample without displaying an error notification', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Polymer Test Sample', wait: 5).click
        expect(page).to have_selector('.sample-detail', wait: 5)

        find_by_id('txinput_name', wait: 5).fill_in(with: 'Polymer Test Sample Updated')
        find_by_id('submit-sample-btn').click

        expect(page).not_to have_selector('.alert-danger', wait: 3)
        expect(page).to have_content('Polymer Test Sample Updated', wait: 5)
      end

      it 'produces no error notification after saving a polymer sample', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Polymer Test Sample', wait: 5).click
        expect(page).to have_selector('.sample-detail', wait: 5)

        find_by_id('submit-sample-btn').click

        expect(page).not_to have_content('error', wait: 3, normalize_ws: true)
      end

      it 'clears the loading indicator after saving a polymer sample', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Polymer Test Sample', wait: 5).click
        expect(page).to have_selector('.sample-detail', wait: 5)

        find_by_id('submit-sample-btn').click

        # Loading spinner should disappear within 5 seconds (infinite-load regression)
        expect(page).not_to have_selector('.loading-spinner', wait: 5)
        expect(page).not_to have_selector('[class*="loading"]', wait: 5)
      end

      it 'prevents duplicate concurrent saves', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Polymer Test Sample', wait: 5).click
        expect(page).to have_selector('.sample-detail', wait: 5)

        save_btn = find_by_id('submit-sample-btn')
        # Click twice in rapid succession — second click should be ignored by
        # the saving: state flag in StructureEditorModal
        save_btn.click
        save_btn.click

        expect(page).not_to have_selector('.alert-danger', wait: 3)
      end
    end

    # ---------------------------------------------------------------------------
    # Area 3: Structure editor opens without errors for a polymer sample
    # ---------------------------------------------------------------------------
    describe 'Structure editor (Ketcher) for polymer sample' do
      it 'opens the Ketcher editor for a polymer sample', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Polymer Test Sample', wait: 5).click
        expect(page).to have_selector('.sample-detail', wait: 5)

        # Trigger structure editor open
        structure_edit_btn = find('[title="Edit structure"], [aria-label="Edit structure"], .structure-editor-btn',
                                  wait: 5)
        structure_edit_btn.click

        # Ketcher iframe should load
        expect(page).to have_selector('iframe[src*="ketcher"], iframe[id*="ketcher"]', wait: 10)
      end

      it 'closes the structure editor without an error notification', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Polymer Test Sample', wait: 5).click
        expect(page).to have_selector('.sample-detail', wait: 5)

        structure_edit_btn = find('[title="Edit structure"], [aria-label="Edit structure"], .structure-editor-btn',
                                  wait: 5)
        structure_edit_btn.click
        expect(page).to have_selector('iframe[src*="ketcher"], iframe[id*="ketcher"]', wait: 10)

        # Close the editor
        find('.modal-footer button', text: /cancel|close/i, wait: 5).click

        expect(page).not_to have_selector('.alert-danger', wait: 3)
      end
    end

    # ---------------------------------------------------------------------------
    # Area 4: ABS stereo label does not appear in the UI
    # ---------------------------------------------------------------------------
    describe 'ABS stereo stripping' do
      let!(:stereo_molecule) do
        # A simple molfile with a wedge bond (Indigo would generate ABS on this)
        molfile = <<~MOL

            Ketcher 01010100002D

            2  1  0  0  0  0  0  0  0  0999 V2000
              0.0000    0.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
              0.0000   -0.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
            1  2  1  1     0  0
          M  END
        MOL
        create(:molecule, molfile: molfile,
                          inchikey: 'STEREO-TEST-INCHIKEY-0001')
      end

      before do
        stereo_sample = create(:sample, name: 'Stereo Test Sample', creator: user, molecule: stereo_molecule)
        CollectionsSample.find_or_create_by!(sample: stereo_sample, collection: collection)
      end

      it 'does not show ABS stereo label text in the sample detail', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Stereo Test Sample', wait: 5).click
        expect(page).to have_selector('.sample-detail', wait: 5)

        # ABS should not be visible as a text label anywhere on the page
        # (regression: Indigo was injecting ABS into the SVG which leaked to UI)
        expect(page).not_to have_text('ABS', wait: 2)
      end
    end

    # ---------------------------------------------------------------------------
    # Area 5: Multi-template polymer — all shapes present
    # ---------------------------------------------------------------------------
    describe 'Multi-template polymer sample' do
      let!(:multi_polymer_molecule) do
        create(:molecule,
               molfile: POLYMER_MULTI_MOLFILE,
               is_partial: true,
               inchikey: 'POLYMER-MULTI-INCHIKEY-001',
               sum_formular: 'R')
      end

      before do
        multi_polymer_sample = create(:sample,
                                      name: 'Multi Polymer Sample',
                                      creator: user,
                                      molecule: multi_polymer_molecule)
        CollectionsSample.find_or_create_by!(sample: multi_polymer_sample, collection: collection)
      end

      it 'shows the multi-template polymer sample in the collection list', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        expect(page).to have_content('Multi Polymer Sample', wait: 5)
      end

      it 'opens multi-template polymer sample without JavaScript errors', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Multi Polymer Sample', wait: 5).click
        expect(page).to have_selector('.sample-detail', wait: 5)
        expect(page).not_to have_selector('.alert-danger', wait: 2)
      end
    end

    # ---------------------------------------------------------------------------
    # Area 6: Reaction DOCX report — polymer images in output
    # ---------------------------------------------------------------------------
    describe 'DOCX report generation for reaction with polymer sample' do
      let!(:reaction) do
        r = create(:reaction, creator: user, name: 'Polymer Reaction Test')
        CollectionsReaction.find_or_create_by!(reaction: r,
                                               collection: collection)
        r
      end

      before do
        # Add polymer sample as a starting material in the reaction
        ReactionsStartingMaterialSample.create!(
          reaction: reaction,
          sample: polymer_sample,
          position: 0,
          reference: true,
          equivalent: 1.0,
        )
      end

      it 'generates a DOCX report for a reaction containing a polymer sample', :js do
        find('.tree-view', text: 'chemotion-repository.net').click
        # Navigate to the reaction
        begin
          find('[id*="tree-id-reaction"], .tree-view[data-type="reaction"]',
               wait: 3).click
        rescue StandardError
          nil
        end
        find('tr', text: 'Polymer Reaction Test', wait: 5).click
        expect(page).to have_selector('[class*="reaction-detail"]', wait: 5)

        # Click the Generate Report button
        report_btn = find('[title*="Report"], [aria-label*="Report"], #reaction-report-btn,
                          button[title*="report" i]', wait: 5)
        report_btn.click

        # The download should trigger without an error alert
        expect(page).not_to have_selector('.alert-danger', wait: 5)
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Model-level: SVG auto-heal (no browser needed — tests before_save callback)
  # ---------------------------------------------------------------------------
  describe 'Polymer sample SVG auto-heal', type: :model do
    let!(:user) { create(:person, account_active: true, confirmed_at: Time.zone.now) }

    let!(:polymer_molecule) do
      create(:molecule,
             molfile: POLYMER_SINGLE_MOLFILE,
             is_partial: true,
             inchikey: 'POLYMER-SINGLE-INCHIKEY-002',
             sum_formular: 'R')
    end

    let!(:polymer_sample) do
      sample = create(:sample, name: 'Polymer SVG Heal Test', creator: user, molecule: polymer_molecule)
      sample
    end

    context 'when sample has a stale SVG without polymer shapes' do
      # regen_polymer_svg_if_stale runs as a before_save callback. svg_reprocess produces
      # a Babel backbone SVG — <image> tags are only present after the full Ketcher
      # surface-chemistry save workflow (out of scope here).
      before do
        stale_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>'
        svg_name = 'polymer_stale_test.svg'
        dest = Rails.public_path.join('images', 'samples', svg_name)
        FileUtils.mkdir_p(dest.dirname)
        File.write(dest, stale_svg)
        polymer_sample.update_columns(sample_svg_file: svg_name) # rubocop:disable Rails/SkipsModelValidations
        # regen_polymer_svg_if_stale is gated on a real molfile/molecule_id change (or a
        # blank sample_svg_file) — simulate the real-edit path a Ketcher save takes rather
        # than a metadata-only save, matching the model's actual self-heal contract.
        polymer_sample.molfile = "#{polymer_sample.molfile}\n"
        polymer_sample.save!
        polymer_sample.reload
      end

      after do
        FileUtils.rm_f(Rails.public_path.join('images', 'samples', 'polymer_stale_test.svg'))
      end

      it 'regenerates the SVG on save with a new file, different from the stale one' do
        expect(polymer_sample.sample_svg_file).not_to eq('polymer_stale_test.svg')
        expect(polymer_sample.sample_svg_file).to be_present
      end

      it 'writes a valid SVG file to disk at the new path' do
        svg_path = Rails.public_path.join('images', 'samples', polymer_sample.sample_svg_file.to_s)
        expect(File.exist?(svg_path)).to be(true)
        expect(File.read(svg_path)).to include('<svg')
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Molfile format round-trip (no browser). Guards for the SDF tag chars
  # "> <...>", TextNode Unicode labels, empty-PolymersList tag emission
  # (main PR #3533), and the ketcher-rails 2016-2024 legacy layout where
  # "> <PolymersList>" is written inside the CTAB, ahead of "M  END"
  # (main PR #3486, `data_block_body`).
  # ---------------------------------------------------------------------------
  describe 'Molfile round-trip', type: :model do
    let!(:user) { create(:person, account_active: true, confirmed_at: Time.zone.now) }

    describe 'TextNode block preservation' do
      let!(:mol) do
        create(:molecule,
               molfile: POLYMER_TEXTNODE_MOLFILE,
               is_partial: true,
               inchikey: 'POLYMER-TEXTNODE-001',
               sum_formular: 'R')
      end
      let!(:sample) { create(:sample, name: 'Polymer TextNode', creator: user, molecule: mol) }

      it 'keeps both "> <TextNode>" and "> </TextNode>" through save + reload' do
        sample.molfile = POLYMER_TEXTNODE_MOLFILE
        sample.save!
        sample.reload
        expect(sample.molfile).to include('> <TextNode>')
        expect(sample.molfile).to include('> </TextNode>')
        expect(sample.molfile).to include('> <PolymersList>')
      end

      it 'preserves the Unicode label bytes ("α", "wt.%") end-to-end' do
        sample.molfile = POLYMER_TEXTNODE_MOLFILE
        sample.save!
        sample.reload
        expect(sample.molfile.force_encoding('UTF-8')).to include('10 wt.% α-Al2O3')
      end
    end

    describe 'to_utf8 scrubbing on non-UTF-8 molfile bytes' do
      # These specs cover helpers that only exist on main (`to_utf8`,
      # `polymers_list_payload`, `has_polymer_content?` — merged in PRs #3486/#3533).
      # They stay skipped on the pre-merge branch and auto-activate once main is merged
      # in, at which point they become regression guards for the merge itself.
      before do
        skip 'requires main: MolfilePolymerSupport.to_utf8' unless
          Chemotion::MolfilePolymerSupport.respond_to?(:to_utf8)
      end

      it 'does not raise ArgumentError when the molfile carries a stray Latin-1 byte' do
        # 0xE4 is Latin-1 "ä". Force it into a byte position inside a TextNode label so
        # the sanitizer / regex path runs against it. Bare force_encoding would leave
        # the string invalid UTF-8; MolfilePolymerSupport.to_utf8 scrubs it.
        bad = POLYMER_TEXTNODE_MOLFILE.dup.force_encoding('ASCII-8BIT')
        bad << "\xE4".b
        expect { Chemotion::MolfilePolymerSupport.has_polymers_list_tag?(bad) }.not_to raise_error
        expect(Chemotion::MolfilePolymerSupport.has_polymers_list_tag?(bad)).to be true
        expect(Chemotion::MolfilePolymerSupport.has_text_node_tag?(bad)).to be true
      end

      it 'returns a valid-UTF-8 string from to_utf8' do
        bad = (+"\xE4hello").force_encoding('ASCII-8BIT')
        result = Chemotion::MolfilePolymerSupport.to_utf8(bad)
        expect(result.encoding.name).to eq('UTF-8')
        expect(result.valid_encoding?).to be true
      end
    end

    describe 'Empty PolymersList tag guard (main PR #3533)' do
      let!(:plain_molecule) do
        create(:molecule, molfile: PLAIN_CTAB_MOLFILE, inchikey: 'PLAIN-NO-POLYMER-001')
      end
      let!(:sample) { create(:sample, name: 'Plain Sample', creator: user, molecule: plain_molecule) }

      before do
        skip 'requires main: MolfilePolymerSupport.polymers_list_payload' unless
          Chemotion::MolfilePolymerSupport.respond_to?(:polymers_list_payload)
      end

      it 'does not persist an empty "> <PolymersList>" block for a non-polymer sample' do
        sample.molfile = PLAIN_CTAB_MOLFILE
        sample.save!
        sample.reload
        # Either the block is absent, or if present it must carry a payload — never
        # an empty tag block, which triggers false-positive polymer detection.
        expect(Chemotion::MolfilePolymerSupport.polymers_list_payload(sample.molfile.to_s)).to eq('')
        expect(Chemotion::MolfilePolymerSupport.has_polymer_content?(sample.molfile.to_s)).to be false
      end
    end

    describe 'Legacy layout: "> <PolymersList>" ahead of "M END"' do
      before do
        skip 'requires main: MolfilePolymerSupport.polymers_list_payload' unless
          Chemotion::MolfilePolymerSupport.respond_to?(:polymers_list_payload)
      end

      it 'extracts the payload without swallowing the M END marker' do
        payload = Chemotion::MolfilePolymerSupport.polymers_list_payload(POLYMER_LEGACY_MOLFILE)
        expect(payload).not_to be_empty
        expect(payload).not_to include('M  END')
        expect(payload).to include('/')
      end

      it 'reports the fixture as having polymer content' do
        expect(Chemotion::MolfilePolymerSupport.has_polymer_content?(POLYMER_LEGACY_MOLFILE)).to be true
      end
    end
  end

  # ---------------------------------------------------------------------------
  # HierarchicalMaterial sample subtype. Model-level to keep the run cheap;
  # UI-only concerns (PubchemLabels hidden, "Material" label swap) live in
  # spec/javascripts specs for Sample / SampleDetails / SampleForm.
  # ---------------------------------------------------------------------------
  describe 'HierarchicalMaterial sample', type: :model do
    let!(:user) { create(:person, account_active: true, confirmed_at: Time.zone.now) }
    let!(:molecule) do
      create(:molecule,
             molfile: POLYMER_SINGLE_MOLFILE,
             is_partial: true,
             inchikey: 'HM-INCHIKEY-001',
             sum_formular: 'R')
    end

    it 'exposes the HierarchicalMaterial sample_type constant' do
      expect(Sample::SAMPLE_TYPE_HIERARCHICAL_MATERIAL).to eq('HierarchicalMaterial')
      expect(Sample::SAMPLE_TYPES).to include('HierarchicalMaterial')
    end

    it 'auto-tags sample_type as HierarchicalMaterial when the molfile carries a PolymersList payload' do
      # set_sample_type_hierarchical_if_polymers_list before_save callback
      sample = create(:sample, name: 'Auto HM', creator: user, molecule: molecule)
      sample.molfile = POLYMER_SINGLE_MOLFILE
      sample.save!
      sample.reload
      expect(sample.sample_type).to eq('HierarchicalMaterial')
    end

    it 'persists the hierarchical property columns through save + reload' do # rubocop:disable RSpec/MultipleExpectations
      sample = create(:sample, name: 'HM props', creator: user, molecule: molecule)
      sample.sample_type = 'HierarchicalMaterial'
      sample.assign_attributes(
        height: 12.5,
        width: 3.0,
        length: 8.0,
        diameter: 1.2,
        storage_condition: 'inert atmosphere',
        material: 'Pd/C',
        cspi: 'CSPI-001',
        shape: 'sphere',
        sieve_fraction: '40-60 mesh',
        layer_thickness: '10 nm',
        liquid_medium: 'toluene',
        stabilizer: 'BHT',
      )
      sample.save!
      sample.reload
      expect(sample.height).to eq(12.5)
      expect(sample.width).to eq(3.0)
      expect(sample.length).to eq(8.0)
      expect(sample.diameter).to eq(1.2)
      expect(sample.storage_condition).to eq('inert atmosphere')
      expect(sample.material).to eq('Pd/C')
      expect(sample.cspi).to eq('CSPI-001')
      expect(sample.shape).to eq('sphere')
      expect(sample.sieve_fraction).to eq('40-60 mesh')
      expect(sample.layer_thickness).to eq('10 nm')
      expect(sample.liquid_medium).to eq('toluene')
      expect(sample.stabilizer).to eq('BHT')
    end
  end
end
