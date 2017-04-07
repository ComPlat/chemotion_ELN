class CollectionsScreen < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :screen

  validate :collection_screen_id_uniqueness

  include Tagging

  def self.move_to_collection(screen_ids, old_col_id, new_col_id)
    # Get associated wellplates
    wellplate_ids = ScreensWellplate.get_wellplates(screen_ids)

    # Delete screens in old collection
    self.delete_in_collection(screen_ids, old_col_id)

    # Move associated wellplates in current collection
    CollectionsWellplate.move_to_collection(wellplate_ids, old_col_id, new_col_id)

    # Create new screens in target collection
    self.static_create_in_collection(screen_ids, new_col_id)
  end

  # Static delete without checking associated
  def self.delete_in_collection(screen_ids, collection_id)
    self.where(
      screen_id: screen_ids,
      collection_id: collection_id
    ).destroy_all
  end

  # Remove from collection and process associated elements
  def self.remove_in_collection(screen_ids, collection_id)
    self.delete_in_collection(screen_ids, collection_id)
  end

  # Static create without checking associated
  def self.static_create_in_collection(screen_ids, collection_id)
    screen_ids.map { |id|
      s = self.with_deleted.find_or_create_by(
        screen_id: id,
        collection_id: collection_id
      )

      s.restore! if s.deleted?
      s
    }
  end

  def self.create_in_collection(screen_ids, collection_id)
    # Get associated wellplates
    wellplate_ids = ScreensWellplate.get_wellplates(screen_ids)

    # Create associated wellplates in collection
    CollectionsWellplate.create_in_collection(wellplate_ids, collection_id)
    # Create new screens in collection
    self.static_create_in_collection(screen_ids, collection_id)
  end

  def collection_screen_id_uniqueness
    unless CollectionsScreen.where(collection_id: collection_id, screen_id: screen_id).empty?
      errors.add(:collection_screen_id_uniqueness, 'Violates uniqueness of screen_id and collection_id')
    end
  end
end
