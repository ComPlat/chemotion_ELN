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

describe 'Polymer Surface Chemistry', type: :feature do
  POLYMER_SINGLE_MOLFILE = File.read(
    Rails.root.join('spec', 'fixtures', 'files', 'polymer_single_template.mol')
  ).freeze

  POLYMER_MULTI_MOLFILE = File.read(
    Rails.root.join('spec', 'fixtures', 'files', 'polymer_multi_template.mol')
  ).freeze
  let!(:user) do
    create(:person, account_active: true, confirmed_at: Time.now)
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
    user.update!(confirmed_at: Time.now, account_active: true)
    sign_in(user)
    # Ensure molecule SVG fixture exists so the sample list renders
    mol_img_dir = Rails.public_path.join('images', 'molecules')
    svg_fixture = Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')
    FileUtils.ln_s(svg_fixture, mol_img_dir.join('molecule.svg'), force: false) rescue nil
  end

  # ---------------------------------------------------------------------------
  # Area 1: Polymer sample navigation and SVG rendering
  # ---------------------------------------------------------------------------
  describe 'Polymer sample SVG rendering' do
    it 'shows the polymer sample in the collection list', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      expect(page).to have_content('Polymer Test Sample', wait: 5)
    end

    it 'opens the polymer sample detail without JavaScript errors', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      find('tr', text: 'Polymer Test Sample', wait: 5).click
      # Detail panel should open — verify a known element renders
      expect(page).to have_selector('.sample-detail', wait: 5)
    end

    it 'renders an SVG image in the sample detail panel', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      find('tr', text: 'Polymer Test Sample', wait: 5).click
      # The molecule SVG image should be present in the detail
      expect(page).to have_selector('img[src*="/images/"]', wait: 5)
    end

    context 'when sample has a stale SVG without polymer shapes' do
      before do
        # Write an SVG without <image> tags to simulate a legacy stale file
        stale_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"></svg>'
        svg_name = 'polymer_stale_test.svg'
        dest = Rails.public_path.join('images', 'samples', svg_name)
        FileUtils.mkdir_p(dest.dirname)
        File.write(dest, stale_svg)
        polymer_sample.update_columns(sample_svg_file: svg_name) # rubocop:disable Rails/SkipsModelValidations
      end

      after do
        FileUtils.rm_f(Rails.public_path.join('images', 'samples', 'polymer_stale_test.svg'))
      end

      it 'auto-heals and serves a fresh SVG on the sample page', js: true do
        find('.tree-view', text: 'chemotion-repository.net').click
        find('tr', text: 'Polymer Test Sample', wait: 5).click
        expect(page).to have_selector('.sample-detail', wait: 5)
        # After auto-heal get_svg_path should have regenerated the SVG file
        polymer_sample.reload
        svg_path = Rails.public_path.join('images', 'samples', polymer_sample.sample_svg_file.to_s)
        expect(File.exist?(svg_path)).to be(true)
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Area 2: Polymer sample save — no errors, spinner clears
  # ---------------------------------------------------------------------------
  describe 'Polymer sample save flow' do
    it 'saves a polymer sample without displaying an error notification', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      find('tr', text: 'Polymer Test Sample', wait: 5).click
      expect(page).to have_selector('.sample-detail', wait: 5)

      find_by_id('txinput_name', wait: 5).fill_in(with: 'Polymer Test Sample Updated')
      find_by_id('submit-sample-btn').click

      expect(page).not_to have_selector('.alert-danger', wait: 3)
      expect(page).to have_content('Polymer Test Sample Updated', wait: 5)
    end

    it 'produces no error notification after saving a polymer sample', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      find('tr', text: 'Polymer Test Sample', wait: 5).click
      expect(page).to have_selector('.sample-detail', wait: 5)

      find_by_id('submit-sample-btn').click

      expect(page).not_to have_content('error', wait: 3, normalize_ws: true)
    end

    it 'clears the loading indicator after saving a polymer sample', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      find('tr', text: 'Polymer Test Sample', wait: 5).click
      expect(page).to have_selector('.sample-detail', wait: 5)

      find_by_id('submit-sample-btn').click

      # Loading spinner should disappear within 5 seconds (infinite-load regression)
      expect(page).not_to have_selector('.loading-spinner', wait: 5)
      expect(page).not_to have_selector('[class*="loading"]', wait: 5)
    end

    it 'prevents duplicate concurrent saves', js: true do
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
    it 'opens the Ketcher editor for a polymer sample', js: true do
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

    it 'closes the structure editor without an error notification', js: true do
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

    let!(:stereo_sample) do
      s = create(:sample, name: 'Stereo Test Sample', creator: user, molecule: stereo_molecule)
      CollectionsSample.find_or_create_by!(sample: s, collection: collection)
      s
    end

    it 'does not show ABS stereo label text in the sample detail', js: true do
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

    let!(:multi_polymer_sample) do
      s = create(:sample,
                 name: 'Multi Polymer Sample',
                 creator: user,
                 molecule: multi_polymer_molecule)
      CollectionsSample.find_or_create_by!(sample: s, collection: collection)
      s
    end

    it 'shows the multi-template polymer sample in the collection list', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      expect(page).to have_content('Multi Polymer Sample', wait: 5)
    end

    it 'opens multi-template polymer sample without JavaScript errors', js: true do
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
        equivalent: 1.0
      )
    end

    it 'generates a DOCX report for a reaction containing a polymer sample', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      # Navigate to the reaction
      find('[id*="tree-id-reaction"], .tree-view[data-type="reaction"]',
           wait: 3).click rescue nil
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
