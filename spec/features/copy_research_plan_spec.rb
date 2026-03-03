# frozen_string_literal: true

require 'rails_helper'

describe 'Copy research plans' do
  let!(:user_one) { create(:user, first_name: 'Hello', last_name: 'Complat', account_active: true) }
  let!(:user_two) { create(:user, first_name: 'User2', last_name: 'Complat', account_active: true) }
  let(:rp_one) { create(:research_plan, creator: user_one, name: 'RP 1', body: []) }
  let!(:col_one) { create(:collection, user_id: user_one.id, label: 'Col1') }

  let(:rp_two) { create(:research_plan, creator: user_one, name: 'RP 2', body: []) }
  let!(:root_share) { create(:collection, user: user_one, shared_by_id: user_two.id, is_shared: true, is_locked: true) }
  let!(:col_share) do
    create(:collection, user: user_one, label: 'share-col', permission_level: 10, shared_by_id: user_two.id,
                        is_shared: true, ancestry: root_share.id.to_s)
  end

  before do
    sign_in(user_one)
    fp = Rails.public_path.join('images', 'molecules', 'molecule.svg')
    svg_path = Rails.root.join('spec/fixtures/images/molecule.svg')
    `ln -s #{svg_path} #{fp} ` unless File.exist?(fp)
    CollectionsResearchPlan.find_or_create_by!(research_plan: rp_one, collection: col_one)
    CollectionsResearchPlan.find_or_create_by!(research_plan: rp_two, collection: col_share)
  end

  it 'new research plan', :js do
    find_by_id('tree-id-Col1').click
    first('i.icon-research-plan').click
    expect(page).to have_no_button('copy-element-btn', wait: 5)
  end

  it 'to same collection', :js do
    find_by_id('tree-id-Col1').click
    first('i.icon-research-plan').click
    find_by_id('tree-id-Col1').click
    expect(page).to have_content('RP 1')
    find('div.preview-table').click
    first('i.fa-clone').click
    find_by_id('submit-copy-element-btn').click
    fill_in('research_plan_name', with: 'RP copy')
    find_field('research_plan_name').set('RP copy').send_keys(:enter)
    expect(page).to have_content('RP copy')
  end

  it 'to diff collection', :js do
    find_by_id('tree-id-Col1').click
    first('i.icon-research-plan').click
    find_by_id('tree-id-Col1').click
    expect(page).to have_content('RP 1')
    find('div.preview-table').click
    first('i.fa-clone').click
    # to diff col:
    find_field('modal-collection-id-select').set('Col2').send_keys(:enter)
    find_by_id('submit-copy-element-btn').click
    find_field('research_plan_name').set('RP copy').send_keys(:enter)
    expect(page).to have_content('RP copy', wait: 5)
  end

  it 'to shared collection with permission', :js do
    find_by_id('shared-home-link').click
    find_all('span.glyphicon-plus')[0].click
    find_by_id('tree-id-share-col').click
    first('i.icon-research-plan').click
    expect(page).to have_content('RP 2', wait: 5)
    find('div.preview-table').click
    first('i.fa-clone').click
    find_field('modal-collection-id-select').set('Col1').send_keys(:enter)
    find_by_id('submit-copy-element-btn').click
    find('.tree-view', text: 'Col1').click
    first('i.icon-research-plan').click
    expect(page).to have_content('RP 2', wait: 5)
  end
end
