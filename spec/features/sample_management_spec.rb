# frozen_string_literal: true

require 'rails_helper'

describe 'Sample management' do
  let!(:user)    { create(:person) }
  let(:sample) { create(:sample, creator: user, collections: user.collections) }

  before do
    user.update!(confirmed_at: Time.now, account_active: true)
    sign_in(user)

    fp = Rails.root.join('public', 'images', 'molecules')
    `ln -s #{Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')} #{fp} ` unless File.exist?(Rails.root.join(fp, 'molecule.svg'))
  end

  describe 'Split sample' do
    before do
      user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: sample, collection: c) }
    end

    it 'splits sample', js: true do
      # actions button is disabled if current collection is 'All'
      expect(find('button#create-split-button')[:disabled]).to eq('true')

      # check if split button is disabled unless we select sample
      find('.tree-view', text: 'chemotion.net').click
      click_button 'create-split-button'
      expect(find('li', text: 'Split Sample')[:class]).to eq('disabled')
      click_button 'create-split-button'

      sample_label = sample.short_label + ' ' + sample.name
      find('tr', text: sample_label).find('input').click
      click_button 'create-split-button'
      click_link 'Split Sample'
      split_sample_label = sample.short_label + '-1 ' + sample.name
      find('tr', text: split_sample_label).click

      molecule_name = find('label', text: 'Molecule')
                      .find(:xpath, '..')
                      .find('.Select-value-label')
                      .text
      expect(molecule_name).to eq(sample.molecule.iupac_name)

      %w[name external_label location purity solvent
         density boiling_point melting_point].each do |field|
        label = field.capitalize.tr('_', ' ')
        value = find_bs_field(label).value
        if begin
              Float(value)
           rescue StandardError
             false
            end
          expect(value.to_f).to eq(sample[field].to_f)
        else
          expect(value).to eq(sample[field])
        end
      end

      amount = sample.target_amount_value * 1000
      expect(find_bs_field('Amount').value.to_f).to eq(amount)

      molarity = sample.molarity_value
      expect(find_bs_field('Molarity').value.to_f).to eq(molarity)

      expect(find('input#inchistringInput')[:disabled]).to eq('true')
      expect(find('input#inchistringInput')[:readonly]).to eq('true')

      # test read-only molecule data
      smile_field = find_bs_field('Canonical Smiles', 'span.input-group-addon')
      expect(smile_field.value.presence).to eq(sample.molecule['cano_smiles'].presence)
      expect(smile_field[:disabled]).to eq('true')
      expect(smile_field[:readonly]).to eq('true')

      # click on EA/polymer section div
      find('div.polymer-section').click

      # check if all EA data has been copied
      sample.elemental_compositions.each do |el_c|
        tr_text = ElementalComposition::TYPES[el_c.composition_type.to_sym]
        ea_table = find('tr', text: tr_text).find(:xpath, '../..')
        el_c.data.each do |element, value|
          if el_c.composition_type == 'found'
            expect(find_bs_field(element).value.to_f).to eq(value.to_f)
          else
            opts = { text: /#{element}\s+#{value.to_f}/ }
            expect { ea_table.find('span.data-item', opts) }.not_to raise_error
          end
        end
      end

      # Analyses will not be copied
      # expect(Sample.last.analyses).to eq(sample.analyses)

      # check SVG file
      expect(Sample.last.sample_svg_file).to eq(sample.sample_svg_file)
    end
  end
end
