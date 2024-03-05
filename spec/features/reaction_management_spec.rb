# frozen_string_literal: true

require 'rails_helper'

describe 'Reaction management' do
  let!(:user) { create(:user, first_name: 'Hallo', last_name: 'Complat') }
  let!(:m1) { create(:molecule, molecular_weight: 171.03448) }
  let!(:m2) { create(:molecule, molecular_weight: 133.15058) }
  let!(:r1) { create(:residue, custom_info: { 'formula' => 'CH', 'loading' => '0.96', 'loading_type' => 'mass', 'polymer_type' => 'polystyrene', 'external_loading' => '2' }) }
  let!(:r2) { create(:residue, custom_info: { 'formula' => 'CH', 'loading' => '0.78', 'loading_type' => 'mass', 'polymer_type' => 'polystyrene', 'external_loading' => '2' }) }
  let!(:mr1) { create(:molecule, molecular_weight: 85.0813) }
  let!(:mr2) { create(:molecule, molecular_weight: 330.2360496) }

  let(:material) { create(:sample, name: 'Material', target_amount_value: 7.15, creator: user, collections: user.collections, molecule: m1) }
  let(:reactant1) { create(:sample, name: 'Reactant1', target_amount_value: 5.435, creator: user, collections: user.collections) }
  let(:reactant2) { create(:sample, name: 'Reactant2', target_amount_value: 3.123, creator: user, collections: user.collections) }
  let(:solvent) { create(:sample, name: 'Solvent', creator: user, collections: user.collections) }
  let(:product) { create(:sample, name: 'Product', real_amount_value: 4.671, creator: user, collections: user.collections, molecule: m2) }
  let(:reaction) { create(:reaction, status: 'Successful', short_label: 'Reaction 1', creator: user, collections: user.collections) }

  let(:material_r) { create(:sample, name: 'Material', target_amount_value: 4.000, creator: user, collections: user.collections, molecule: mr1, residues: [r1]) }
  let(:product_r) { create(:sample, name: 'Product', real_amount_value: 3.600, creator: user, collections: user.collections, molecule: mr2, residues: [r2]) }
  let(:reaction_r) { create(:reaction, status: 'Successful', short_label: 'Reaction 2', creator: user, collections: user.collections) }

  before do
    user.update!(confirmed_at: Time.now, account_active: true)
    sign_in(user)
    fp = Rails.root.join('public', 'images', 'molecules')
    `ln -s #{Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')} #{fp} ` unless File.exist?(Rails.root.join(fp, 'molecule.svg'))
  end

  describe 'reaction management without residues' do
    before do
      user.collections.each do |c|
        CollectionsSample.find_or_create_by!(sample: material, collection: c)
        CollectionsSample.find_or_create_by!(sample: reactant1, collection: c)
        CollectionsSample.find_or_create_by!(sample: reactant2, collection: c)
        CollectionsSample.find_or_create_by!(sample: solvent, collection: c)
        CollectionsSample.find_or_create_by!(sample: product, collection: c)
        CollectionsReaction.find_or_create_by!(reaction: reaction, collection: c)
      end
      ReactionsStartingMaterialSample.create!(reaction: reaction, sample: material, reference: true, equivalent: 1)
      ReactionsReactantSample.create!(reaction: reaction, sample: reactant1, equivalent: 2)
      ReactionsReactantSample.create!(reaction: reaction, sample: reactant2, equivalent: 2)
      ReactionsSolventSample.create!(reaction: reaction, sample: solvent, equivalent: 1)
      ReactionsProductSample.create!(reaction: reaction, sample: product, equivalent: 1)
    end

    it 'Yield 50%', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      first('i.icon-reaction').click
      first('span.isvg.loaded.reaction').click
      material_amount = 6800

      find('div#reaction-detail-tab a#reaction-detail-tab-tab-scheme').click

      tab_scheme = find('div#reaction-detail-tab div.tab-content')
      material_field = tab_scheme.first('span.input-group').find_all('input').first
      material_field.click

      material_field.set(material_amount)
      material_field.click
      max_amount = material_amount / material.molecule.molecular_weight * product.molecule.molecular_weight / 2
      product_table = find('th', text: 'Products').find(:xpath, '../../../..')
      prod_field = product_table.first('tr.general-material').first('span.input-group').find('input')
      prod_field.click
      prod_field.set(max_amount.round(2))
      prod_field.click
      # mol_m = material_field.value.to_f / material.molecule.molecular_weight
      # mol_p = prod_field.value.to_f / product.molecule.molecular_weight
      # current_yield = (mol_p / mol_m * 100).to_i.to_s + '%'
      yield_field = product_table.find_all('input').last
      yield_field.click
      expect(yield_field.value).to eq('50%')
      expect(page).to have_content('max theoretical mass')
    end
  end

  #
  # describe 'reaction management contains residues' do
  #   before do
  #     user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: material_r, collection: c) }
  #     user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: reactant1, collection: c) }
  #     user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: reactant2, collection: c) }
  #     user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: solvent, collection: c) }
  #     user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: product_r, collection: c) }
  #     user.collections.each { |c| CollectionsReaction.find_or_create_by!(reaction: reaction_r, collection: c) }
  #     ReactionsStartingMaterialSample.create!(reaction: reaction_r, sample: material_r, reference: true, equivalent: 1)
  #     ReactionsReactantSample.create!(reaction: reaction_r, sample: reactant1, equivalent: 2)
  #     ReactionsReactantSample.create!(reaction: reaction_r, sample: reactant2, equivalent: 2)
  #     ReactionsSolventSample.create!(reaction: reaction_r, sample: solvent, equivalent: 1)
  #     ReactionsProductSample.create!(reaction: reaction_r, sample: product_r, equivalent: 0.73)
  #   end
  #
  #   scenario 'Yield with contains residues', js: true do
  #     find('.tree-view', text: 'chemotion.net').click
  #     first('i.icon-reaction').click
  #     find('span.isvg').click
  #     material_amount = 3780
  #
  #     tab_pane = find('div#reaction-detail-tab', match: :first, wait: 10).click
  #     tab_scheme = tab_pane.first('div.tab-content').click
  #     material_field = tab_scheme.first('span.input-group').find_all('input').first
  #     material_field.click
  #     material_field.set(material_amount)
  #     material_field.click
  #     max_amount = material_r.amount_g + ((material_amount * material_r.residues[0].custom_info['loading'].to_f / 1000) * (product_r.molecule.molecular_weight - material_r.molecule.molecular_weight));
  #     product_table_r = find('th', text: 'Products').find(:xpath, '../../../..')
  #     product_amount = product_table_r.first('tr.general-material').first("span.input-group").find('input').value.to_f
  #     mol_m = (material_amount * material_r.residues[0].custom_info['loading'].to_f) / 1000;
  #     mol_p = (product_amount * product_r.residues[0].custom_info['loading'].to_f) / 1000;
  #     current_yield = ( mol_p / mol_m * 100 ).to_i.to_s + '%'
  #     yield_field = product_table_r.find_all('input').last
  #     yield_field.click
  #     expect(yield_field.value).to eq(current_yield)
  #     expect(page).not_to have_content('max theoretical mass')
  #   end
  # end
end
