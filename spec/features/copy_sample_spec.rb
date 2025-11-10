# frozen_string_literal: true

require 'rails_helper'

describe 'Copy sample' do
  let!(:user) { create(:user, first_name: 'Hallo', last_name: 'Complat', account_active: true, confirmed_at: Time.now) }
  let!(:user2) { create(:user, first_name: 'User2', last_name: 'Complat', account_active: true, confirmed_at: Time.now) }
  let!(:mol) { create(:molecule, molecular_weight: 171.03448) }
  let(:sample) { create(:sample, name: 'PH-1234', real_amount_value: 4.671, molecule: mol, solvent: [], collections: [col1]) }
  let(:sample2) { create(:sample, name: 'PH-2222', real_amount_value: 4.671, molecule: mol, solvent: [], collections: [cshare]) }
  let(:sample3) { create(:sample, name: 'PH-3333', real_amount_value: 4.671, molecule: mol, solvent: [], collections: [cshare2]) }
  let!(:col1) { create(:collection, user_id: user.id, label: 'Col1') }
  let!(:col2) { create(:collection, user_id: user.id, label: 'Col2') }

  let!(:root_share) do
    create(:collection, user: user2).tap do |collection|
      create(:collection_share, collection: collection, shared_with: user)
    end
  end
  let!(:cshare) do
    create(:collection, user: user2, label: 'share-col', parent: root_share).tap do |collection|
      create(:collection_share, collection: collection, shared_with: user)
    end
  end
  let!(:cshare2) do
    create(:collection, user: user2, label: 'share-col-2', parent: root_share).tap do |collection|
      create(:collection_share, collection: collection, shared_with: user, sample_detail_level: 0)
    end
  end

  before do
    sign_in(user)
    fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
    svg_path = Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')
    `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)
  end

  it 'new sample', js: true do
    find_by_id('tree-id-Col1').click
    first('i.icon-sample').click
    expect(page).not_to have_button('copy-element-btn', wait: 5)
  end

  it 'to same collection', js: true do
    find_by_id('tree-id-Col1').click
    find_all('.label--bold', text: 'PH-1234').first.click
    first('i.fa-clone').click
    find_by_id('submit-copy-element-btn').click
    find_by_id('txinput_name').set('Sample B').send_keys(:enter)
    find_by_id('submit-sample-btn').click
    expect(page).to have_content('Sample B')
  end

  it 'to diff collection', js: true do # rubocop:disable RSpec/MultipleExpectations
    find('.tree-view', text: 'Col1').click
    find_all('.label--bold', text: 'PH-1234').first.click
    first('i.fa-clone').click
    find_field('modal-collection-id-select').set('Col2').send_keys(:enter)
    find_by_id('submit-copy-element-btn').click
    find_by_id('txinput_name').set('Sample B').send_keys(:enter)
    find_by_id('submit-sample-btn').click
    find('.tree-view', text: 'Col2').click
    find_all('.label--bold', text: 'Sample B').first.click
    expect(page).to have_content('Sample B')
  end

  it 'copy shared collection with permission', js: true do # rubocop:disable RSpec/MultipleExpectations
    find_by_id('shared-home-link').click
    find_all('span.glyphicon-plus')[0].click
    find_by_id('tree-id-share-col').click
    expect(page).to have_content('PH-2222', wait: 5)
    find_all('.label--bold', text: 'PH-2222').first.click
    expect(page).to have_button('copy-element-btn', wait: 5)
    first('i.fa-clone').click
    find_field('modal-collection-id-select').set('Col2').send_keys(:enter)
    find_by_id('submit-copy-element-btn').click
    find_by_id('txinput_name').set('Sample B').send_keys(:enter)
    find_by_id('submit-sample-btn').click
    find('.tree-view', text: 'Col2').click
    find_all('.label--bold', text: 'Sample B').first.click
    expect(page).to have_content('Sample B')
  end

  it 'copy shared collection without permission', js: true do # rubocop:disable RSpec/MultipleExpectations
    find_by_id('shared-home-link').click
    find_all('span.glyphicon-plus')[0].click
    find_by_id('tree-id-share-col-2').click
    expect(page).to have_content('***', wait: 5)
    find_all('.label--bold', text: '***').first.click
    expect(page).not_to have_button('copy-element-btn', wait: 5)
  end
end
