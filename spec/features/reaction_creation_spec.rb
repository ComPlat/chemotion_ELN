# frozen_string_literal: true

require 'rails_helper'

describe 'Create and update Reaction' do
  let!(:user) { create(:user, first_name: 'Hallo', last_name: 'Complat', account_active: true, confirmed_at: Time.now) }
  let!(:m1) { create(:molecule, molecular_weight: 171.03448) }
  let!(:m2) { create(:molecule, molecular_weight: 133.15058) }
  let(:material) { create(:sample, name: 'Material', target_amount_value: 7.15, collections: user.collections, molecule: m1) }
  let(:product) { create(:sample, name: 'Product', real_amount_value: 4.671, collections: user.collections, molecule: m2) }

  before do
    sign_in(user)
    fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
    svg_path = Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')
    `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)

    user.collections.each do |c|
      CollectionsSample.find_or_create_by!(sample: material, collection: c)
      CollectionsSample.find_or_create_by!(sample: product, collection: c)
    end
  end

  it 'Create and update reaction UI', js: true do
    find('.tree-view', text: 'chemotion.net').click
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
    expect(page).to have_content('reaction A')

    find_by_id('reaction-detail-name').set('reaction B').send_keys(:enter)
    find_by_id('submit-reaction-btn').click
    expect(page).to have_content('reaction B')
  end
end