module Usecases
  module Sharing
    class ShareWithUsers
      def initialize(**params)
        @params = params
      end

      def execute!
        collection_attributes = @params.fetch(:collection_attributes, {}).merge(is_shared: true)
        @params.fetch(:user_ids, []).each do |user_id|
          collection_attributes[:user_id] = user_id
          collection_attributes[:label] = new_collection_label(user_id)
          Usecases::Sharing::ShareWithUser.new(
            collection_attributes: collection_attributes,
            sample_ids: @params.fetch(:sample_ids, []),
            reaction_ids:  @params.fetch(:reaction_ids, []),
            wellplate_ids:  @params.fetch(:wellplate_ids, []),
            screen_ids:  @params.fetch(:screen_ids, []),
            research_plan_ids:  @params.fetch(:research_plan_ids, [])
          ).execute!
        end
      end

      private

      def new_collection_label(user_id)
        "My project with #{User.find(user_id).name}"
      end
    end
  end
end
