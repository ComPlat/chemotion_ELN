module Usecases
  module Sharing
    class ShareWithUsers
      def initialize(params, current_user)
        @params = params
        @current_user = current_user
      end

      def execute!
        current_user_id = @current_user.id
        user_ids = @params.fetch(:user_ids, [])
        collection_attributes = @params.fetch(:collection_attributes, {})
        collection_attributes[:shared_by_id] = current_user_id

        current_collection_id = @params.fetch(:current_collection_id, {})
        elements_filter = @params.fetch(:elements_filter, {})

        user_ids.each do |user_id|
          collection_attributes[:user_id] = user_id
          collection_attributes[:label] = new_collection_label(user_id)

          new_params = {
            collection_attributes: collection_attributes,
            sample_ids: Sample.for_user(current_user_id).for_ui_state(elements_filter.fetch(:sample, [])).pluck(:id),
            reaction_ids: Reaction.for_user(current_user_id).for_ui_state(elements_filter.fetch(:reaction, [])).pluck(:id),
            wellplate_ids: Wellplate.for_user(current_user_id).for_ui_state(elements_filter.fetch(:wellplate, [])).pluck(:id),
            screen_ids: Screen.for_user(current_user_id).for_ui_state(elements_filter.fetch(:screen, [])).pluck(:id),
            #research_plan_ids: ResearchPlan.for_user(current_user_id).for_ui_state(elements_filter.fetch(:research_plan, [])).pluck(:id),
            current_collection_id: current_collection_id
          }

          Usecases::Sharing::ShareWithUser.new(new_params).execute!
        end
      end

      private

      def new_collection_label(user_id)
        "My project with #{User.find(user_id).name}"
      end
    end
  end
end
