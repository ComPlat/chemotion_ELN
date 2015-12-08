class CollectionsSample < ActiveRecord::Base
  acts_as_paranoid
  belongs_to :collection
  belongs_to :sample
  validate :collection_sample_id_uniqueness

  def collection_sample_id_uniqueness
    unless CollectionsSample.where(collection_id: collection_id, sample_id: sample_id).empty?
      errors.add(:collection_sample_id_uniqueness, 'Violates uniqueness of sample_id and collection_id')
    end
  end
end
