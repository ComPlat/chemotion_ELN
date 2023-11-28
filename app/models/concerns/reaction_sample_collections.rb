module ReactionSampleCollections
  extend ActiveSupport::Concern

  included do
    after_create :assign_sample_to_collections
  end

private

  def assign_sample_to_collections
    return unless reaction

    self.reaction.collections.each do |c|
      CollectionsSample.where(sample: self.sample, collection: c).first_or_create
    end
  end
end
