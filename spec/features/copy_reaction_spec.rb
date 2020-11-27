# frozen_string_literal: true

require 'rails_helper'

describe 'Copy reactions' do
  let!(:user) { create(:user, first_name: 'Hallo', last_name: 'Complat', account_active: true, confirmed_at: Time.now) }
  let!(:user2) { create(:user, first_name: 'User2', last_name: 'Complat', account_active: true, confirmed_at: Time.now) }
  let!(:m1) { create(:molecule, molecular_weight: 171.03448) }
  let!(:m2) { create(:molecule, molecular_weight: 133.15058) }
  let(:material) { create(:sample, name: 'Material', target_amount_value: 7.15, molecule: m1) }
  let(:product) { create(:sample, name: 'Product', real_amount_value: 4.671, molecule: m2) }
  let(:reaction) { create(:reaction, status: 'Successful', short_label: 'Reaction1') }

  let(:material2) { create(:sample, name: 'Material2', target_amount_value: 7.15, molecule: m1) }
  let(:product2) { create(:sample, name: 'Product2', real_amount_value: 4.671, molecule: m2) }
  let(:reaction2) { create(:reaction, status: 'Successful', short_label: 'Reaction2') }

  let(:material3) { create(:sample, name: 'Material3', target_amount_value: 7.15, molecule: m1) }
  let(:product3) { create(:sample, name: 'Product3', real_amount_value: 4.671, molecule: m2) }
  let(:reaction3) { create(:reaction, status: 'Successful', short_label: 'Reaction3') }

  let!(:col) { create(:collection, user_id: user.id, label: 'Col1') }

  let!(:root_share) { create(:collection, user: user, shared_by_id: user2.id, is_shared: true, is_locked: true) }
  let!(:cshare) { create(:collection, user: user, label: 'share-col', permission_level: 10, sample_detail_level: 10, reaction_detail_level: 10, shared_by_id: user2.id, is_shared: true, ancestry: root_share.id.to_s) }
  let!(:cshare2) { create(:collection, user: user, label: 'share-col-2', permission_level: 10, sample_detail_level: 0, reaction_detail_level: 0, shared_by_id: user2.id, is_shared: true, ancestry: root_share.id.to_s) }

  before do
    sign_in(user)
    fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
    svg_path = Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')
    `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)

    CollectionsSample.find_or_create_by!(sample: material, collection: col)
    CollectionsSample.find_or_create_by!(sample: product, collection: col)
    CollectionsReaction.find_or_create_by!(reaction: reaction, collection: col)
    ReactionsStartingMaterialSample.create!(reaction: reaction, sample: material, reference: true, equivalent: 1)
    ReactionsProductSample.create!(reaction: reaction, sample: product, equivalent: 1)

    CollectionsSample.find_or_create_by!(sample: material2, collection: cshare)
    CollectionsSample.find_or_create_by!(sample: product2, collection: cshare)
    CollectionsReaction.find_or_create_by!(reaction: reaction2, collection: cshare)
    ReactionsStartingMaterialSample.create!(reaction: reaction2, sample: material2, reference: true, equivalent: 1)
    ReactionsProductSample.create!(reaction: reaction2, sample: product2, equivalent: 1)

    CollectionsSample.find_or_create_by!(sample: material3, collection: cshare2)
    CollectionsSample.find_or_create_by!(sample: product3, collection: cshare2)
    CollectionsReaction.find_or_create_by!(reaction: reaction3, collection: cshare2)
    ReactionsStartingMaterialSample.create!(reaction: reaction3, sample: material3, reference: true, equivalent: 1)
    ReactionsProductSample.create!(reaction: reaction3, sample: product3, equivalent: 1)

  end

  it ' new reaction', js: true do
    find_by_id('tree-id-Col1').click
    first('i.icon-reaction').click
    expect(page).not_to have_button('copy-element-btn', wait: 5)
  end

  it 'to same collection', js: true do
    find_by_id('tree-id-Col1').click
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
    find_by_id('col-mgnt-btn').click
    find_by_id('mycol_-1').click
    find_all('input[type="text"]')[2].set('Col2')
    find_by_id('my-collections-update-btn').click
    find_by_id('col-mgnt-btn').click
    find_by_id('tree-id-Col1').click
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

  it ' shared collection with copy permission', js: true do
    find_by_id('shared-home-link').click
    find_all('span.glyphicon-plus')[0].click
    find_by_id('tree-id-share-col').click
    first('i.icon-reaction').click
    expect(page).to have_content('Reaction', wait: 5)
    first('i.c-bs-success').click
    expect(page).to have_button('copy-element-btn', wait: 5)
    first('i.fa-clone').click
    find_field('modal-collection-id-select').set('Col1').send_keys(:enter)
    find_by_id('submit-copy-element-btn').click
    find_field('reaction_name').set('reaction B').send_keys(:enter)
    find_by_id('submit-reaction-btn').click
    find('.tree-view', text: 'Col1').click
    first('i.icon-reaction').click
    first('i.c-bs-success').click
    expect(page).to have_content('reaction B')
  end

  it ' shared collection without copy permission', js: true do
    find_by_id('shared-home-link').click
    find_all('span.glyphicon-plus')[0].click
    find_by_id('tree-id-share-col-2').click
    first('i.icon-reaction').click
    expect(page).to have_content('***', wait: 5)
    find_all('div', text: '*** ***', exact_text: true)[2].click
    expect(page).not_to have_button('copy-element-btn', wait: 5)
  end
end
