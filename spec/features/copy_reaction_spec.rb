# frozen_string_literal: true

require 'rails_helper'

describe 'Copy reaction' do
  let!(:user1) { create(:user, first_name: 'User1', last_name: 'Complat', name_abbreviation: 'US1', account_active: true, confirmed_at: Time.now) }
  let!(:user2) { create(:user, first_name: 'User2', last_name: 'Complat', name_abbreviation: 'US2', account_active: true, confirmed_at: Time.now) }

  let!(:col1) { create(:collection, user_id: user1.id, label: 'Col1') }
  let!(:col2) { create(:collection, user_id: user1.id, label: 'Col2') }
  let!(:col3) { create(:collection, user_id: user1.id, label: 'Col3') }

  let!(:m1) { create(:molecule, molecular_weight: 171.03448) }
  let!(:m2) { create(:molecule, molecular_weight: 133.15058) }

  let(:material1) { create(:sample, name: 'Material1', target_amount_value: 7.15, molecule: m1, collections: [col3]) }
  let(:product1) { create(:sample, name: 'Product1', real_amount_value: 4.671, molecule: m2, collections: [col3]) }
  let(:reaction1) { create(:reaction, status: 'Successful', short_label: 'Reaction1', collections: [col3]) }

  let(:material2) { create(:sample, name: 'Material2', target_amount_value: 7.15, molecule: m1, collections: [shared_collection_with_high_detail_level]) }
  let(:product2) { create(:sample, name: 'Product2', real_amount_value: 4.671, molecule: m2, collections: [shared_collection_with_high_detail_level]) }
  let(:reaction2) { create(:reaction, status: 'Successful', short_label: 'Reaction2', collections: [shared_collection_with_high_detail_level]) }

  let(:material3) { create(:sample, name: 'Material3', target_amount_value: 7.15, molecule: m1, collections: [shared_collection_with_low_detail_level]) }
  let(:product3) { create(:sample, name: 'Product3', real_amount_value: 4.671, molecule: m2, collections: [shared_collection_with_low_detail_level]) }
  let(:reaction3) { create(:reaction, status: 'Successful', short_label: 'Reaction3', collections: [shared_collection_with_low_detail_level]) }


  let!(:shared_collection_with_high_detail_level) do
    create(:collection, user: user2, label: 'HighDL').tap do |collection|
      create(:collection_share, collection: collection, shared_with: user1, permission_level: 10, sample_detail_level: 10, reaction_detail_level: 10)
    end
  end
  let(:shared_collection_with_low_detail_level) do
    create(:collection, user: user2, label: 'LowDL').tap do |collection|
      create(:collection_share, collection: collection, shared_with: user1, permission_level: 10, sample_detail_level: 10, reaction_detail_level: 10)
    end
  end

  def copy_reaction(source_collection, target_collection)
    find_by_id("tree-id-#{source_collection}").click
    find('.elements-list-tab-reactions').click
    find('div.preview-table', text: 'Reaction').click
    click_button('copy-element-btn')
    fill_in('modal-collection-id-select', with: target_collection).send_keys(:enter)
    click_button('submit-copy-element-btn') # ELN switches over to `target_collection` at this point
    expect(page).to have_css("div#tree-id-#{target_collection}.title.selected") # wait until ELN switched to `target_collection`
    expect(page).to have_content('According to General Procedure', wait: 5) # assert that ELN opened tab for copied reaction
    fill_in('reaction_name', with: 'copied-reaction')
    click_button('submit-reaction-btn')
    expect(page).to have_css('div.preview-table', text: 'copied-reaction', wait: 5) # assert that copied reaction appears in reaction table
  end

  context 'when handling own collections' do
    before do
      fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
      svg_path = Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')
      `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)
      ReactionsStartingMaterialSample.create!(reaction: reaction1, sample: material1, reference: true, equivalent: 1)
      ReactionsProductSample.create!(reaction: reaction1, sample: product1, equivalent: 1)

      ReactionsStartingMaterialSample.create!(reaction: reaction2, sample: material2, reference: true, equivalent: 1)
      ReactionsProductSample.create!(reaction: reaction2, sample: product2, equivalent: 1)

      ReactionsStartingMaterialSample.create!(reaction: reaction3, sample: material3, reference: true, equivalent: 1)
      ReactionsProductSample.create!(reaction: reaction3, sample: product3, equivalent: 1)

      sign_in(user1)
    end

    it 'new reaction', js: true do
      find_by_id('tree-id-Col1').click
      first('i.icon-reaction').click
      expect(page).not_to have_button('copy-element-btn', wait: 5)
    end

    it 'to same collection', js: true do
      find_by_id('tree-id-Col3').click
      first('i.icon-reaction').click
      first('i.c-bs-success').click
      first('i.fa-clone').click
      find_by_id('submit-copy-element-btn').click
      find_field('reaction_name').set('reaction B').send_keys(:enter)
      find_by_id('submit-reaction-btn').click

      # FIXME: Improve this spec by getting rid of the sleep after being on a
      # stable rails 5.0 version
      sleep 6
      expect(page).to have_content('reaction B')
    end

    it 'to diff collection', js: true do
      find_by_id('tree-id-Col3').click
      first('i.icon-reaction').click
      first('i.c-bs-success').click
      first('i.fa-clone').click
      find_field('modal-collection-id-select').set('Col2').send_keys(:enter)
      find_by_id('submit-copy-element-btn').click
      find_field('reaction_name').set('reaction B').send_keys(:enter)
      find_by_id('submit-reaction-btn').click
      # FIXME: Improve this spec by getting rid of the sleep after being on a
      # stable rails 5.1 version
      sleep 6
      expect(page).to have_content('reaction B')
    end
  end

  context 'from own collection' do
    before do
      # sign_in(user1)

      fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
      svg_path = Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')
      `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)

      ReactionsStartingMaterialSample.create!(reaction: reaction1, sample: material1, reference: true, equivalent: 1)
      ReactionsProductSample.create!(reaction: reaction1, sample: product1, equivalent: 1)

      ReactionsStartingMaterialSample.create!(reaction: reaction2, sample: material2, reference: true, equivalent: 1)
      ReactionsProductSample.create!(reaction: reaction2, sample: product2, equivalent: 1)
    end

    it 'to different own collection', js: true do
      copy_reaction('Col1', 'Col2')
    end

    it 'to same own collection', js: true do
      copy_reaction('Col1', 'Col1')
    end
  end

  context 'from shared-with-me collection' do
    before do
      fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
      svg_path = Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')
      `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)

      CollectionsSample.find_or_create_by!(sample: material1, collection: col1_shared)
      CollectionsSample.find_or_create_by!(sample: product1, collection: col1_shared)
      CollectionsReaction.find_or_create_by!(reaction: reaction1, collection: col1_shared)
      ReactionsStartingMaterialSample.create!(reaction: reaction1, sample: material1, reference: true, equivalent: 1)
      ReactionsProductSample.create!(reaction: reaction1, sample: product1, equivalent: 1)

      CollectionsSample.find_or_create_by!(sample: material2, collection: col2_shared)
      CollectionsSample.find_or_create_by!(sample: product2, collection: col2_shared)
      CollectionsReaction.find_or_create_by!(reaction: reaction2, collection: col2_shared)
      ReactionsStartingMaterialSample.create!(reaction: reaction2, sample: material2, reference: true, equivalent: 1)
      ReactionsProductSample.create!(reaction: reaction2, sample: product2, equivalent: 1)
    end

    it 'with copy permission to own collection', js: true do
      find_by_id('shared-home-link').click
      find('span.glyphicon-plus').click
      copy_reaction('HighDL', 'Col1')
    end

    it 'without copy permission to own collection', js: true do
      find_by_id('shared-home-link').click
      find('span.glyphicon-plus').click
      find_by_id('tree-id-LowDL-shared').click
      find('i.icon-reaction').click
      find('div.preview-table').click
      expect(page).not_to have_button('copy-element-btn')
    end
  end
end
