# frozen_string_literal: true

require 'rails_helper'

describe 'Create and update Reaction' do
  let!(:user) { create(:user, first_name: 'Hallo', last_name: 'Complat', account_active: true, confirmed_at: Time.now) }
  let!(:m1) { create(:molecule, molecular_weight: 171.03448) }
  let!(:m2) { create(:molecule, molecular_weight: 133.15058) }
  let(:material) { create(:sample, name: 'Material', target_amount_value: 7.15, molecule: m1) }
  let(:product) { create(:sample, name: 'Product', real_amount_value: 4.671, molecule: m2) }

  before do
    sign_in(user)
    fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
    svg_path = Rails.root.join('spec', 'fixtures', 'images', 'molecule.svg')
    `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)

    col = Collection.find_by(user: user, label: 'chemotion.net')
    CollectionsSample.find_or_create_by!(sample_id: material.id, collection_id: col.id)
    CollectionsSample.find_or_create_by!(sample_id: product.id, collection_id: col.id)
  end

  it 'Create and update reaction UI', js: true do
    find_by_id('tree-id-chemotion.net').click
    find_by_id('create-split-button').click
    find_by_id('create-reaction-button').click
    source = first('span.dnd-arrow-enable')
    scheme_tab = find_by_id('reaction-detail-tab-pane-scheme')
    target1 = scheme_tab.find_all('span.glyphicon-plus')[0]
    source.drag_to(target1)
    target2 = scheme_tab.find_all('span.glyphicon-plus')[2]
    source.drag_to(target2)
    find_field('reaction_name').set('reaction A').send_keys(:enter)
    find_by_id('submit-reaction-btn').click
    expect(page).to have_content('reaction A', wait: 5)
    find_field('reaction_name').set('reaction B').send_keys(:enter)
    find_by_id('submit-reaction-btn').click
    expect(page).to have_content('reaction B', wait: 5)
  end
end
