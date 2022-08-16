# frozen_string_literal: true

require 'rails_helper'

describe 'Collection management' do
  let!(:user) { create(:person) }

  before do
    user.update!(confirmed_at: Time.now, account_active: true)
    sign_in(user)
  end

  describe 'Create an unshared collection' do
    let(:factory_collection_name) { 'Hello Collection' }

    it 'create an unshared collection', js: true do
      # press Collections button (on the left-side tree view)
      find('div.take-ownership-btn').click
      sleep 2

      # press Add(plus) button to add collection
      find('div.root-actions').find(:xpath, '..').all('button')[0].click

      # input collection name
      new_collection = all('input.collection-label.form-control').last
      new_collection.click
      new_collection.set(factory_collection_name)

      # find update button to save changes
      find('button#my-collections-update-btn.btn.btn-xs.btn-warning').click

      expect(page).to have_content(factory_collection_name)
      page.refresh
      expect(find('.tree-view', text: factory_collection_name).text).to eq(factory_collection_name)
    end
  end

  describe 'Delete an unshared collection' do
    let!(:collection) { create(:collection, user_id: user.id) }
    let(:factory_collection_name) { collection.label }

    it 'delete an unshared collection', js: true do
      # press Collections button (on the left-side tree view)
      find('div.take-ownership-btn').click

      # expect before deletion to have content
      expect(page).to have_content(factory_collection_name)

      # press Delete button to delete the collection
      first("div.actions.btn-group [class='btn btn-xs btn-danger']:last-of-type").click

      # press Update button to save
      find('button#my-collections-update-btn.btn.btn-xs.btn-warning').click

      # except after deletion
      expect(page).not_to have_content(factory_collection_name)
    end
  end
end
