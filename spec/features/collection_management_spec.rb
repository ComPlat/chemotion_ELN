# frozen_string_literal: true

require 'rails_helper'

describe 'Collection management' do
  let(:user) { create(:person, confirmed_at: Time.now, account_active: true) }

  describe 'Create an unshared collection' do
    let(:collection_name) { 'Hello Collection' }

    it 'create an unshared collection', js: true do
      sign_in(user)

      find_by_id('collection-management-button').click
      sleep 2

      find_by_id('add-new-collection-button').click

      # input collection name
      new_collection = all('input.collection-label.form-control').last
      new_collection.click
      new_collection.set(collection_name)

      # find update button to save changes
      find_by_id('save-collections-button').click

      expect(page).to have_content(collection_name)
      page.refresh
      expect(find('.tree-view', text: collection_name).text).to eq(collection_name)
    end
  end

  describe 'Delete an unshared collection' do
    let(:collection) { create(:collection, user: user) }
    let(:collection_name) { collection.label }

    before do
      # trigger creation of all required objects
      collection_name
    end

    it 'delete an unshared collection', js: true do
      sign_in(user)
      find_by_id('collection-management-button').click

      # expect before deletion to have content
      expect(page).to have_content(collection_name)

      find_by_id("delete-collection-button_#{collection.id}").click
      find_by_id('save-collections-button').click

      # except after deletion
      expect(page).not_to have_content(collection_name)
    end
  end

  describe 'Rename a collection' do
    let(:collection) { create(:collection, user: user) }
    let(:new_collection_name) { 'Foo-Bar' }

    before do
      collection
    end

    it 'saves the new collection name', js: true do
      sign_in(user)
      collection_entry = find_by_id("tree-id-#{collection.label}")
      expect(collection_entry).to have_content collection.label
      find_by_id('collection-management-button').click

      label_input = all('input.collection-label.form-control').last
      expect(label_input.value).to eq collection.label

      label_input.click
      label_input.set(new_collection_name)

      find_by_id('save-collections-button').click
      find_by_id('collection-management-button').click

      collection_entry = find_by_id("tree-id-#{new_collection_name}")
      expect(collection_entry).to have_content new_collection_name
    end
  end
end
