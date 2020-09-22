# frozen_string_literal: true

require 'rails_helper'

describe 'Sync Collection Test' do
  let!(:user1) { create(:user, first_name: 'User1', last_name: 'Complat', account_active: true, confirmed_at: Time.now) }
  let!(:m1) { create(:molecule, molecular_weight: 171.03448) }
  let!(:m2) { create(:molecule, molecular_weight: 133.15058) }
  let(:reaction) { create(:reaction, status: 'Successful', short_label: 'Reaction 1') }
  let(:material) { create(:sample, name: 'Material', target_amount_value: 7.15, molecule: m1) }
  let(:product) { create(:sample, name: 'Product', real_amount_value: 4.671, molecule: m2) }
  let!(:col) { create(:collection, user_id: user1.id, label: 'sync_test') }

  def sync_collection(permission)
    find_by_id('col-mgnt-btn').click
    find_by_id('sync-users-btn').click
    select(permission, from: 'permissionLevelSelect').select_option
    select('Everything', from: 'reactionDetailLevelSelect').select_option
    sus = find_by_id('share-users-select').set('User')
    expect(page).to have_content('User2', wait: 5)
    sus.send_keys(:down)
    sus.send_keys(:enter)
    find_by_id('create-sync-shared-col-btn').click
    find_by_id('my-collections-update-btn').click
    find_by_id('col-mgnt-btn').click
  end

  def create_reaction
    find_by_id('tree-id-sync_test').click
    find_by_id('create-split-button').click
    find_by_id('create-reaction-button').click
    source = first('span.dnd-arrow-enable')
    scheme_tab = find_by_id('reaction-detail-tab-pane-0')
    target1 = scheme_tab.find_all('span.glyphicon-plus')[0]
    source.drag_to(target1)
    target2 = scheme_tab.find_all('span.glyphicon-plus')[2]
    source.drag_to(target2)
    find_by_id('reaction-detail-name').set('reaction A').send_keys(:enter)
    find_by_id('submit-reaction-btn').click
    expect(page).to have_content('reaction A', wait: 10)
  end

  def update_reaction
    find_by_id('reaction-detail-name').set('reaction B').send_keys(:enter)
    find_by_id('submit-reaction-btn').click
  end
  before do
    user2 = User.create!({first_name: 'User2', password: 'iamuser2', last_name: 'Complat', account_active: true, email: 'user2@complat.edu', name_abbreviation: 'US2'})
    sign_in(user1)

    fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
    svg_path = Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')
    `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)

    CollectionsSample.find_or_create_by!(sample_id: material.id, collection_id: col.id)
    CollectionsSample.find_or_create_by!(sample_id: product.id, collection_id: col.id)
  end

  it 'Sync collection with write permission', js: true do
    create_reaction
    sync_collection('Write')
    first('span.glyphicon-log-out').click
    find_by_id('user_login').set('US2')
    find_by_id('user_password').set('iamuser2')
    find('input[type="submit"]').click
    find_by_id('synchron-home-link').click
    find_all('span.glyphicon-plus')[0].click
    find_by_id('tree-id-sync_test').click
    update_reaction
    expect(page).not_to have_content('Close this window')
  end

  it 'Sync collection with read permission', js: true do
    create_reaction
    sync_collection('Read')
    first('span.glyphicon-log-out').click
    find_by_id('user_login').set('US2')
    find_by_id('user_password').set('iamuser2')
    find('input[type="submit"]').click
    find_by_id('synchron-home-link').click
    find_all('span.glyphicon-plus')[0].click
    find_by_id('tree-id-sync_test').click
    update_reaction
    expect(page).to have_content('Close this window')
  end
end
