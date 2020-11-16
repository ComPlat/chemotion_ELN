# == Schema Information
#
# Table name: collections_screens
#
#  id            :integer          not null, primary key
#  collection_id :integer
#  screen_id     :integer
#  deleted_at    :datetime
#
# Indexes
#
#  index_collections_screens_on_collection_id                (collection_id)
#  index_collections_screens_on_deleted_at                   (deleted_at)
#  index_collections_screens_on_screen_id_and_collection_id  (screen_id,collection_id) UNIQUE
#

class CollectionsScreen < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection
  belongs_to :screen

  include Tagging
  include Collecting

  # Remove from collection and process associated elements
  def self.remove_in_collection(screen_ids, from_col_ids)
    # Get associated wellplates
    wellplate_ids = ScreensWellplate.get_wellplates(screen_ids)
    # Remove screens from collection
    delete_in_collection(screen_ids, from_col_ids)
    # Update element tag with collection info
    update_tag_by_element_ids(screen_ids)
    # Remove associated wellplates from collections
    # this also remove associated samples from collections
    CollectionsWellplate.remove_in_collection(wellplate_ids, from_col_ids)
  end

  def self.move_to_collection(screen_ids, from_col_ids, to_col_ids)
    # Get associated wellplates
    wellplate_ids = ScreensWellplate.get_wellplates(screen_ids)
    # Remove screens from collection
    delete_in_collection(screen_ids, from_col_ids)
    # Move associated wellplates to collection
    # this also move associated samples to collection
    CollectionsWellplate.move_to_collection(wellplate_ids, from_col_ids, to_col_ids)
    # Associate screens to collection
    static_create_in_collection(screen_ids, to_col_ids)
  end

  def self.create_in_collection(screen_ids, to_col_ids)
    # Get associated wellplates
    wellplate_ids = ScreensWellplate.get_wellplates(screen_ids)
    # Associate wellplates to collection
    # this also associate samples to collection
    CollectionsWellplate.create_in_collection(wellplate_ids, to_col_ids)
    # Associate screens to collection
    static_create_in_collection(screen_ids, to_col_ids)
  end
end
