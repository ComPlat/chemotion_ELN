class CollectionsWellplate < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :wellplate
  validate :collection_wellplate_id_uniqueness

  def collection_wellplate_id_uniqueness
    unless CollectionsWellplate.where(collection_id: collection_id, wellplate_id: wellplate_id).empty?
      errors.add(:collection_wellplate_id_uniqueness, 'Violates uniqueness of wellplate_id and collection_id')
    end
  end
end
