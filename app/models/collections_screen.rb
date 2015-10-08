class CollectionsScreen < ActiveRecord::Base
  belongs_to :collection
  belongs_to :screen

  validate :collection_screen_id_uniqueness

  def collection_screen_id_uniqueness
    unless CollectionsScreen.where(collection_id: collection_id, screen_id: screen_id).empty?
      errors.add(:collection_screen_id_uniqueness, 'Violates uniqueness of screen_id and collection_id')
    end
  end
end
