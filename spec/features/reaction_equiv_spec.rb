require 'rails_helper'

feature 'Reaction Equiv Spec' do
  let!(:user) { create(:user, first_name: 'Hallo', last_name: 'Complat') }
  let!(:m1) { create(:molecule, molecular_weight: 171.03448) }
  let!(:m2) { create(:molecule, molecular_weight: 133.15058) }
  let!(:r1) { create(:residue, custom_info:({"formula"=>"CH","loading"=>"0.96","loading_type"=>"mass","polymer_type"=>"polystyrene","external_loading"=>"2"})) }
  let!(:r2) { create(:residue, custom_info:({"formula"=>"CH","loading"=>"0.78","loading_type"=>"mass","polymer_type"=>"polystyrene","external_loading"=>"2"})) }
  let!(:mr1) { create(:molecule, molecular_weight: 85.0813) }
  let!(:mr2) { create(:molecule, molecular_weight: 330.2360496) }

  let(:material) { create(:sample, name:'Material', target_amount_value: 7.15, creator: user, collections: user.collections, molecule: m1) }
  let(:reactant1) { create(:sample, name:'Reactant1', target_amount_value: 5.435, creator: user, collections: user.collections) }
  let(:reactant2) { create(:sample, name:'Reactant2', target_amount_value: 3.123, creator: user, collections: user.collections) }
  let(:solvent) { create(:sample, name:'Solvent',creator: user, collections: user.collections) }
  let(:product) { create(:sample, name:'Product',real_amount_value: 4.671, creator: user, collections: user.collections, molecule: m2) }
  let(:reaction) { create(:reaction, short_label: 'Reaction 1', creator: user, collections: user.collections) }

  let(:material_r) { create(:sample, name:'Material', target_amount_value: 4.000, creator: user, collections: user.collections, molecule: mr1, residues: [r1]) }
  let(:product_r) { create(:sample, name:'Product',real_amount_value: 3.600, creator: user, collections: user.collections, molecule: mr2, residues: [r2]) }
  let(:reaction_r) { create(:reaction, short_label: 'Reaction 2', creator: user, collections: user.collections) }

  background do
    user.confirmed_at = Time.now
    user.save
    sign_in(user)
    fp = Rails.root.join("public", "images", "molecules")
    `ln -s #{Rails.root.join("spec", "fixtures", "images", "molecule.svg")} #{fp} ` unless File.exist?(Rails.root.join(fp, "molecule.svg"))
  end

  describe 'reaction amount changed with fixed Equiv' do
    before do
      user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: material, collection: c) }
      user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: reactant1, collection: c) }
      user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: reactant2, collection: c) }
      user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: solvent, collection: c) }
      user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: product, collection: c) }
      user.collections.each { |c| CollectionsReaction.find_or_create_by!(reaction: reaction, collection: c) }
      ReactionsStartingMaterialSample.create!(reaction: reaction, sample: material, reference: true, equivalent: 1)
      ReactionsReactantSample.create!(reaction: reaction, sample: reactant1, equivalent: 2)
      ReactionsSolventSample.create!(reaction: reaction, sample: solvent, equivalent: 1)
      ReactionsProductSample.create!(reaction: reaction, sample: product, equivalent: 1)
    end
    scenario 'change material amount', js: true do
      find('.tree-view', text: 'chemotion.net').click
      first('i.icon-reaction').click
      find('span.isvg').click
      material_new_amount = 5000

      tab_pane = find('div#reaction-detail-tab', match: :first, wait: 10).click
      tab_scheme = tab_pane.first('div.tab-content').click
      switch_equiv_button = tab_pane.first('button#lock_equiv_column_btn').click
      material_field = tab_scheme.first('span.input-group').find_all('input').first
      material_orig_amount = material_field.value.to_i
      reactants_table = find('th', text: 'Reactants').find(:xpath, '../../../..')
      reactants_field = reactants_table.first('tr.general-material').first("span.input-group").find('input')
      reactants_orig_amount = reactants_field.value.to_i
      material_field.click
      material_field.set(material_new_amount)
      material_field.click
      reactants_field.click
      reactants_new_amount = reactants_field.value.to_i
      expect_result = (material_new_amount / material.molecule.molecular_weight * 2) * reactant1.molecule.molecular_weight
      expect(reactants_new_amount).to eq(expect_result.to_i)
    end
  end

  describe 'reaction amount changed with fixed Equiv contains residues' do
    before do
          user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: material_r, collection: c) }
          user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: reactant1, collection: c) }
          user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: reactant2, collection: c) }
          user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: solvent, collection: c) }
          user.collections.each { |c| CollectionsSample.find_or_create_by!(sample: product_r, collection: c) }
          user.collections.each { |c| CollectionsReaction.find_or_create_by!(reaction: reaction_r, collection: c) }
          ReactionsStartingMaterialSample.create!(reaction: reaction_r, sample: material_r, reference: true, equivalent: 1)
          ReactionsReactantSample.create!(reaction: reaction_r, sample: reactant1, equivalent: 2)
          ReactionsReactantSample.create!(reaction: reaction_r, sample: reactant2, equivalent: 2)
          ReactionsSolventSample.create!(reaction: reaction_r, sample: solvent, equivalent: 1)
          ReactionsProductSample.create!(reaction: reaction_r, sample: product_r, equivalent: 0.73)
    end
    scenario 'change material amount for contains residues', js: true do
      find('.tree-view', text: 'chemotion.net').click
      first('i.icon-reaction').click
      find('span.isvg').click
      material_new_amount = 8000

      tab_pane = find('div#reaction-detail-tab', match: :first, wait: 10).click
      tab_scheme = tab_pane.first('div.tab-content').click
      switch_equiv_button = tab_pane.first('button#lock_equiv_column_btn').click
      material_field = tab_scheme.first('span.input-group').find_all('input').first
      material_orig_amount = material_field.value.to_i
      reactants_table = find('th', text: 'Reactants').find(:xpath, '../../../..')
      reactants_field = reactants_table.first('tr.general-material').first("span.input-group").find('input')
      reactants_orig_amount = reactants_field.value.to_i
      material_field.click
      material_field.set(material_new_amount)
      material_field.click
      reactants_field.click
      reactants_new_amount = reactants_field.value.to_i
      expect_result = (material_new_amount * material_r.residues[0].custom_info['loading'].to_f / 1000) * 2 * reactant1.molecule.molecular_weight
      expect(reactants_new_amount).to eq(expect_result.to_i)
    end
  end
end
