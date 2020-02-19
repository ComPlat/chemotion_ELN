# frozen_string_literal: true

require 'rails_helper'

describe 'Pages' do
  let!(:john) { create(:person) }

  before do
    john.update!(confirmed_at: Time.now, account_active: true)
    sign_in(john)
  end

  describe 'Change Profile' do
    it 'sets "Show external name" from false to true, and vice versa', js: true do
      [true, false].each do |bool_flag|
        visit '/pages/profiles'
        expect(john.reload.profile.show_external_name).to eq !bool_flag

        page.find(:css, 'input[type="checkbox"]').set(bool_flag)
        click_button 'Change my profile'
        sleep 1
        expect(john.reload.profile.show_external_name).to eq(bool_flag)
      end
    end
  end
end
