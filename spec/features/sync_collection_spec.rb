# frozen_string_literal: true

require 'rails_helper'

describe 'Sync Collection Test' do
  let!(:user1) { create(:user, first_name: 'User1', last_name: 'Complat',
    account_active: true, confirmed_at: Time.now) }
  let!(:col) { create(:collection, user_id: user1.id, label: 'sync_test') }
  let(:reaction) { create(:reaction) }

  def first_user_syncs_collection(permission)
    click_button('col-mgnt-btn')
    click_button('sync-users-btn')
    select(permission, from: 'permissionLevelSelect')
    select('Everything', from: 'reactionDetailLevelSelect')
    sus = fill_in('share-users-select', with: 'User')
    expect(page).to have_content('User2 Complat (US2)')
    sus.send_keys(:down)
    sus.send_keys(:enter)
    click_button('create-sync-shared-col-btn')
    click_button('my-collections-update-btn')
    click_button('col-mgnt-btn')
    click_link('Log out')
  end

  def second_user_accesses_synced_collection
    fill_in('user_login', with: 'US2')
    fill_in('user_password', with: 'iamuser2')
    click_button('commit')
    find_by_id('synchron-home-link').click
    find('span.glyphicon-plus').click
    find_by_id('tree-id-sync_test').click
    find('i.icon-reaction').click
    find('tr').click
  end

  before do
    User.create!(first_name: 'User2', password: 'iamuser2', last_name: 'Complat',
      account_active: true, email: 'user2@complat.edu', name_abbreviation: 'US2')
    sign_in(user1)

    fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
    svg_path = Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')
    `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)

    CollectionsReaction.create!(reaction: reaction, collection: col)
  end

  it 'Sync collection with write permission', js: true do
    first_user_syncs_collection('Write')
    second_user_accesses_synced_collection
    expect(page).to have_field('reaction_name', disabled: false)
  end

  it 'Sync collection with read permission', js: true do
    first_user_syncs_collection('Read')
    second_user_accesses_synced_collection
    expect(page).to have_field('reaction_name', disabled: true)
  end
end
