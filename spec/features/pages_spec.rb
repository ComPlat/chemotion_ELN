require 'rails_helper'

feature 'Pages' do
  let(:john) { create(:person) }

  background do
    sign_in(john)
  end

  describe 'Change Profile' do
    before do
      visit '/pages/profiles'
    end

    scenario 'sets "Show external name" from false to true, and vice versa', js: true do
      expect(john.reload.profile.show_external_name).to eq false

      page.find(:css, 'input[type="checkbox"]').set(true)
      click_button 'Change my profile'

      expect(john.reload.profile.show_external_name).to eq true

      visit '/pages/profiles'
      page.find(:css, 'input[type="checkbox"]').set(false)
      click_button 'Change my profile'

      expect(john.reload.profile.show_external_name).to eq false
    end
  end
end
