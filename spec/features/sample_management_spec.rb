require 'rails_helper'

feature 'Sample management' do
  let(:user)    { create(:user) }
  let(:sample) { create(:sample, creator: user) }

  background do
    user.confirm
    sign_in(user)
  end

  describe 'Split sample' do
    before do
      CollectionsSample.create!(sample: sample, collection: user.collections[0])
    end

    scenario 'splits sample', js: true do
      # actions button is disabled if current collection is 'All'
      expect(find('button#create-split-button')[:disabled]).to eq('true')

      # check if split button is disabled unless we select sample
      find('.tree-view', text: user.collections.first.label).click
      click_button 'create-split-button'
      expect(find('li', text: 'Split Sample')[:class]).to eq('disabled')
      click_button 'create-split-button'

      sample_label =  sample.short_label  + ' ' + sample.name
      find('tr', text: sample_label).find('input').click
      click_button 'create-split-button'
      click_link 'Split Sample'
      split_sample_label = sample.short_label  + '-1 ' + sample.name
      find('tr', text: split_sample_label).click

      expect(find_bs_field('Molecule').value).to eq(sample.molecule.iupac_name)

      %w(name external_label location purity solvent
          density boiling_point melting_point).each do |field|
        label = field.capitalize.gsub('_', ' ')
        value = find_bs_field(label).value
        if (Float(value) rescue false)
          expect(value.to_f).to eq(sample[field].to_f)
        else
          expect(value).to eq(sample[field])
        end
      end

      amount = sample.target_amount_value.to_s
      expect(find_bs_field('Amount').value).to eq(amount)

      molarity_float = sample.molarity_value * (sample.molarity_unit === 'M' ? 1 : 1000)
      molarity = molarity.to_s
      expect(find_bs_field('Molarity').value.to_f.to_s).to eq(molarity)

      # test read-only molecule data
      { inchistring: 'InChI', cano_smiles: 'Canonical Smiles' }.each do |f, v|
        inchi_field = find_bs_field(v, 'span.input-group-addon')
        expect(inchi_field.value).to eq(sample.molecule[f])
        expect(inchi_field[:disabled]).to eq('true')
        expect(inchi_field[:readonly]).to eq('true')
      end

      # click on EA/polymer section div
      find('div.polymer-section').click

      # check if all EA data has been copied
      sample.elemental_compositions.each do |el_c|
        tr_text = ElementalComposition::TYPES[el_c.composition_type.to_sym]
        ea_table = find('tr', text: tr_text).find(:xpath, '../..')
        el_c.data.each do |element, value|
          if(el_c.composition_type == 'found')
            expect(find_bs_field(element).value.to_f).to eq(value.to_f)
          else
            opts = { text: "#{element} #{value.to_f}" }
            expect{ea_table.find('span.data-item', opts)}.not_to raise_error
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
