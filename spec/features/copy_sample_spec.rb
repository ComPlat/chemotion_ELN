# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable RSpec/IndexedLet
describe 'Copy sample' do
  let(:user) { create(:user, first_name: 'Hallo', last_name: 'Complat') }
  let(:user2) { create(:user, first_name: 'User2', last_name: 'Complat') }
  let(:mol) { create(:molecule, molecular_weight: 171.03448) }
  let(:sample) do
    create(:sample, name: 'PH-1234', real_amount_value: 4.671, molecule: mol, solvent: [], collections: [col1])
  end
  let(:sample2) do
    create(:sample, name: 'PH-2222', real_amount_value: 4.671, molecule: mol, solvent: [], collections: [cshare])
  end
  let(:sample3) do
    create(:sample, name: 'PH-3333', real_amount_value: 4.671, molecule: mol, solvent: [], collections: [cshare2])
  end
  let(:col1) do
    create(:collection, user_id: user.id, label: 'Col1')
  end
  let(:col2) do
    create(:collection, user_id: user.id, label: 'Col2')
  end
  let(:cshare) do
    create(:collection, user: user2, label: 'share-col').tap do |collection|
      create(:collection_share, collection: collection, shared_with: user)
    end
  end
  let(:cshare2) do
    create(:collection, user: user2, label: 'share-col-2').tap do |collection|
      create(:collection_share, collection: collection, shared_with: user, sample_detail_level: 0)
    end
  end

  before do
    sample
    sample2
    sample3
    col2

    sign_in(user)
    fp = Rails.public_path.join('images/molecules/molecule.svg')
    svg_path = Rails.root.join('spec/fixtures/images/molecule.svg')
    `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)
  end

  it 'new sample', :js do
    find_by_id('tree-id-Col1').click
    first('i.icon-sample').click
    expect(page).not_to have_button('copy-element-btn', wait: 5)
  end

  it 'to same collection', :js do
    find_by_id('tree-id-Col1').click
    find_all('.label--bold', text: 'PH-1234').first.click
    first('i.fa-clone').click
    find_by_id('submit-copy-element-btn').click
    find_by_id('txinput_name').set('Sample B').send_keys(:enter)
    find_by_id('submit-sample-btn').click
    expect(page).to have_content('Sample B')
  end

  it 'to diff collection', :js do
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

  it 'copy shared collection with permission', :js do
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

  it 'copy shared collection without permission', :js do
    find_by_id('shared-home-link').click
    find_all('span.glyphicon-plus')[0].click
    find_by_id('tree-id-share-col-2').click
    expect(page).to have_content('***', wait: 5)
    find_all('.label--bold', text: '***').first.click
    expect(page).not_to have_button('copy-element-btn', wait: 5)
  end
end
# rubocop:enable RSpec/IndexedLet
