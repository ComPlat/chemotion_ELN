# frozen_string_literal: true

require 'rails_helper'

describe 'Copy sample' do
  let(:user) { create(:user, first_name: 'Hallo', last_name: 'Complat') }
  let(:user2) do
    create(
      :user,
      first_name: 'User2',
      password: 'iamuser2',
      last_name: 'Complat',
      account_active: true,
      email: 'user2@complat.edu',
      name_abbreviation: 'US2',
    )
  end
  let(:mol) { create(:molecule, molecular_weight: 171.03448) }
  let(:sample) do
    create(:sample, name: 'PH-1234', real_amount_value: 4.671, molecule: mol, collections: [collection_a])
  end
  let(:collection_a) { create(:collection, user_id: user.id, label: 'Col1') }
  let(:collection_b) { create(:collection, user_id: user.id, label: 'Col2') }

  before do
    sample
    collection_b
    user2

    sign_in(user)
    fp = Rails.public_path.join('images/molecules/molecule.svg')
    svg_path = Rails.root.join('spec/fixtures/images/molecule.svg')
    `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)
  end

  it 'share with permission read everything', :js do
    find_by_id('tree-id-Col1').click
    find_all('input[type="checkbox"]').first.click
    first('i.fa-share-alt').click
    select('Read', from: 'permissionLevelSelect').select_option
    select('Everything', from: 'sampleDetailLevelSelect').select_option
    sus = find_by_id('share-users-select').set('User')
    expect(page).to have_content('User2', wait: 5)
    sus.send_keys(:down)
    sus.send_keys(:enter)
    find_by_id('create-sync-shared-col-btn').click
    first('span.glyphicon-log-out').click
    find_by_id('user_login').set('US2')
    find_by_id('user_password').set('iamuser2')
    find('input[type="submit"]').click
    find_by_id('shared-home-link').click
    find_all('span.glyphicon-plus')[0].click
    find_by_id('tree-id-My project with User2 Complat').click
    expect(page).to have_content('PH-1234', wait: 5)
  end

  it 'share with permission read limited', :js do
    find_by_id('tree-id-Col1').click
    find_all('input[type="checkbox"]').first.click
    first('i.fa-share-alt').click
    select('Read', from: 'permissionLevelSelect').select_option
    select('Molecular mass of the compound, external label', from: 'sampleDetailLevelSelect').select_option
    sus = find_by_id('share-users-select').set('User')
    expect(page).to have_content('User2', wait: 5)
    sus.send_keys(:down)
    sus.send_keys(:enter)
    find_by_id('create-sync-shared-col-btn').click
    first('span.glyphicon-log-out').click
    find_by_id('user_login').set('US2')
    find_by_id('user_password').set('iamuser2')
    find('input[type="submit"]').click
    find_by_id('shared-home-link').click
    find_all('span.glyphicon-plus')[0].click
    find_by_id('tree-id-My project with User2 Complat').click
    expect(page).to have_content('***', wait: 5)
  end
end
