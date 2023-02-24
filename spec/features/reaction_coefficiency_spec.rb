# frozen_string_literal: true

require 'rails_helper'

describe 'Coeffiency Reactions' do
  let!(:user) do
    create(:user, first_name: 'Hallo', last_name: 'Complat', account_active: true, confirmed_at: Time.zone.now)
  end
  let(:reaction) { create(:reaction, status: 'Successful', short_label: 'Reaction1') }

  describe 'Coeffiency First Reaction' do
    let!(:m1) { create(:molecule, iupac_name: 'H', molecular_weight: 2) }
    let!(:m2) { create(:molecule, iupac_name: 'molecular oxygen', molecular_weight: 32) }
    let!(:m3) { create(:molecule, iupac_name: 'oxydane', molecular_weight: 18) }
    let(:material_first) do
      create(:sample, name: 'Material', target_amount_value: 0.004, molecule: m1, target_amount_unit: 'g',
                      real_amount_value: nil, real_amount_unit: 'g')
    end
    let(:material_second) do
      create(:sample, name: 'Material', target_amount_value: 0.032, molecule: m2, target_amount_unit: 'g',
                      real_amount_value: nil, real_amount_unit: 'g')
    end
    let(:product) do
      create(:sample, name: 'Product', molecule: m3, real_amount_value: 0.036, real_amount_unit: 'g',
                      target_amount_value: 0)
    end

    before do
      sign_in(user)
      fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
      svg_path = Rails.root.join('spec/fixtures/images/molecule.svg')
      `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)

      col = Collection.find_by(user: user, label: 'chemotion-repository.net')
      CollectionsSample.find_or_create_by!(sample: material_first, collection: col)
      CollectionsSample.find_or_create_by!(sample: material_second, collection: col)
      CollectionsSample.find_or_create_by!(sample: product, collection: col)

      CollectionsReaction.find_or_create_by!(reaction: reaction, collection: col)
      ReactionsStartingMaterialSample.create!(reaction: reaction, sample: material_first,
                                              reference: true, equivalent: 1)
      ReactionsStartingMaterialSample.create!(reaction: reaction, sample: material_second,
                                              reference: false, equivalent: 0.5035425483256437)
      ReactionsProductSample.create!(reaction: reaction, sample: product, equivalent: 0.10)
    end

    it 'Coeffiency 100%', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      first('i.icon-reaction').click
      first('span.isvg.loaded.reaction').click
      inputs = find_all("input[name='coefficient']")
      inputs[0].set(2)
      inputs[1].set(1)
      inputs[2].set(2)
      find_by_id('submit-reaction-btn').click
      expect(find("input[name='yield']").value).to eq('100%')
    end

    it 'Coeffiency 50%', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      first('i.icon-reaction').click
      first('span.isvg.loaded.reaction').click
      coefficients = find_all("input[name='coefficient']")
      coefficients[2].set(4)
      coefficients[0].set(2)
      coefficients[1].set(1)
      find_by_id('submit-reaction-btn').click
      expect(find("input[name='yield']").value).to eq('50%')
    end

    it 'Mass value is larger than possible', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      first('i.icon-reaction').click
      first('span.isvg.loaded.reaction').click
      coefficients = find_all("input[name='coefficient']")
      coefficients[0].set(2)
      coefficients[1].set(1)
      coefficients[2].set(1)
      messages = find_all('.notification-message', text: 'Experimental mass value is larger than possible')
      expect(messages.length).to be >= 1
    end
  end

  describe 'Coeffiency Second Reaction' do
    let!(:m1) { create(:molecule, iupac_name: 'sodimu(1+)', molecular_weight: 22.98) }
    let!(:m2) { create(:molecule, iupac_name: 'molecular chlorine', molecular_weight: 70.9) }
    let!(:m3) { create(:molecule, iupac_name: 'sodium chloride', molecular_weight: 58.44) }
    let(:material_first) do
      create(:sample, name: 'Material', target_amount_value: 30, molecule: m1, target_amount_unit: 'g',
                      real_amount_value: nil, real_amount_unit: 'g')
    end
    let(:material_second) do
      create(:sample, name: 'Material', target_amount_value: 20, molecule: m2, target_amount_unit: 'g',
                      real_amount_value: nil, real_amount_unit: 'g')
    end
    let(:product) do
      create(:sample, name: 'Product', molecule: m3, real_amount_value: 75, real_amount_unit: 'g',
                      target_amount_value: 0)
    end

    before do
      sign_in(user)
      fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
      svg_path = Rails.root.join('spec/fixtures/images/molecule.svg')
      `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)

      col = Collection.find_by(user: user, label: 'chemotion-repository.net')
      CollectionsSample.find_or_create_by!(sample: material_first, collection: col)
      CollectionsSample.find_or_create_by!(sample: material_second, collection: col)
      CollectionsSample.find_or_create_by!(sample: product, collection: col)

      CollectionsReaction.find_or_create_by!(reaction: reaction, collection: col)
      ReactionsStartingMaterialSample.create!(reaction: reaction, sample: material_first,
                                              reference: true, equivalent: 1)
      ReactionsStartingMaterialSample.create!(reaction: reaction, sample: material_second, reference: false,
                                              equivalent: 0.2162)
      ReactionsProductSample.create!(reaction: reaction, sample: product, equivalent: 0.98)
    end

    it 'Coeffiency 100%', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      first('i.icon-reaction').click
      first('span.isvg.loaded.reaction').click
      inputs = find_all("input[name='coefficient']")
      inputs[0].set(2)
      inputs[1].set(1)
      inputs[2].set(2)
      find_by_id('submit-reaction-btn').click
      expect(find("input[name='yield']").value).to eq('98%')
    end

    it 'Coeffiency 50%', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      first('i.icon-reaction').click
      first('span.isvg.loaded.reaction').click
      coefficients = find_all("input[name='coefficient']")
      coefficients[0].set(4)
      coefficients[1].set(2)
      coefficients[2].set(8)
      find_by_id('submit-reaction-btn').click
      expect(find("input[name='yield']").value).to eq('49%')
    end

    it 'Mass value is larger than possible', js: true do
      find('.tree-view', text: 'chemotion-repository.net').click
      first('i.icon-reaction').click
      first('span.isvg.loaded.reaction').click
      coefficients = find_all("input[name='coefficient']")
      coefficients[0].set(4)
      coefficients[1].set(2)
      coefficients[2].set(2)
      messages = find_all('.notification-message', text: 'Experimental mass value is larger than possible')
      expect(messages.length).to be >= 1
    end
  end
end
