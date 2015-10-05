module Usecases
  module Sharing
    class TakeOwnership
      def initialize(params)
        @params = params
      end

      def execute!
        c = Collection.find(@params[:id])
        # if user already owns the (unshared) collection, there is nothing to do here
        return if (c.user_id == @params[:current_user_id]) && (c.is_shared == false)

        sample_ids = c.samples.pluck(:id)
        reaction_ids = c.reactions.pluck(:id)
        wellplate_ids = c.wellplates.pluck(:id)

        owner = User.find(c.shared_by_id)
        owner_collections = owner.collections
        owner_sample_collections = owner_collections.includes(:samples).where('samples.id IN (?)', sample_ids).references(:samples)
        owner_reaction_collections = owner_collections.includes(:reactions).where('reactions.id IN (?)', reaction_ids).references(:reacions)
        owner_wellplate_collections = owner_collections.includes(:wellplates).where('wellplates.id IN (?)', wellplate_ids).references(:wellplates)

        ActiveRecord::Base.transaction do
          c.update(is_shared: false, parent: nil, shared_by_id: nil)

          # delete all associations of former_owner to elements included in c
          CollectionsSample.where('sample_id IN (?) AND collection_id IN (?)', sample_ids, owner_sample_collections.pluck(:id)).delete_all
          CollectionsReaction.where('reaction_id IN (?) AND collection_id IN (?)', reaction_ids, owner_reaction_collections.pluck(:id)).delete_all
          CollectionsWellplate.where('wellplate_id IN (?) AND collection_id IN (?)', wellplate_ids, owner_wellplate_collections.pluck(:id)).delete_all
        end
      end
    end
  end
end
