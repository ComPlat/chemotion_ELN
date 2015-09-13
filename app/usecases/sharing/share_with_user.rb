module Usecases
  module Sharing
    class ShareWithUser
      def initialize(params)
        @params = params
      end

      def execute!
        ActiveRecord::Base.transaction do
          c = Collection.create(@params.fetch(:collection_attributes, {}))

          @params.fetch(:sample_ids, []).each do |sample_id|
            CollectionsSample.create(collection_id: c.id, sample_id: sample_id)
          end

          @params.fetch(:reaction_ids, []).each do |reaction_id|
            CollectionsReaction.create(collection_id: c.id, reaction_id: reaction_id)
          end
        end
      end
    end
  end
end
