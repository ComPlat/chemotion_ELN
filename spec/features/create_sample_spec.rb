# frozen_string_literal: true

require 'rails_helper'

describe 'Create sample' do
  let!(:user) { create(:user, first_name: 'Hallo', last_name: 'Complat', account_active: true, confirmed_at: Time.now) }
  let!(:col1) { create(:collection, user_id: user.id, label: 'Col1') }

  before do
    sign_in(user)
  end

  it ' with smile', js: true do
    expect(page).to have_content('Col1', wait: 3)
    find('.tree-view', text: 'Col1').click
    find_by_id('create-split-button').click
    find_by_id('create-sample-button').click
    sheader = first('i.glyphicon-chevron-right')
    sheader.click
    smile = 'c1cc(cc(c1)c1ccccc1)c1ccccc1'
    smile_field = find_by_id('smilesInput')
    smile_field.click
    smile_field.set(smile)
    find_by_id('smile-create-molecule').click
    find_by_id('txinput_name').set('Sample A').send_keys(:enter)
    find_by_id('submit-sample-btn').click
    find_by_id('txinput_name').set('Sample B').send_keys(:enter)
    find_by_id('submit-sample-btn').click
    expect(page).to have_content('Sample B')
  end
end
