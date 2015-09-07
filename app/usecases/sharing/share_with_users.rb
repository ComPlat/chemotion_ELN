module Usecases
  module Sharing
    class ShareWithUsers
      def initialize(params)
        @params = params
      end

      def execute!
        user_ids = @params.fetch(:user_ids, [])
        collection_attributes = @params.fetch(:collection_attributes, {})
        
        elements_filter = @params.fetch(:elements_filter, {})
        sample_ids = elements_filter.fetch(:sample_ids, [])
        reaction_ids = elements_filter.fetch(:reaction_ids, [])

        user_ids.each do |user_id|
          collection_attributes[:user_id] = user_id
          new_params = {
            collection_attributes: collection_attributes,
            sample_ids: sample_ids,
            reaction_ids: reaction_ids
          }
          Usecases::Sharing::ShareWithUser.new(new_params).execute!
        end
      end
    end
  end
end
