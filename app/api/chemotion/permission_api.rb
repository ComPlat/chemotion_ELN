module Chemotion
  class PermissionAPI < Grape::API
    resource :permissions do
      desc "Returns if selected elements contain a top secret sample"
      params do
        requires :elements_filter, type: Hash do
          optional :sample, type: Hash do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end

          optional :reaction, type: Hash do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end

          optional :wellplate, type: Hash do
            optional :all, type: Boolean
            optional :included_ids, type: Array
            optional :excluded_ids, type: Array
          end
        end
      end

      post :top_secret do
        usecase = Usecases::Sharing::ShareWithUsers.new(params)
        sample_ids = usecase.getElementIds(params[:elements_filter], Sample)
        reaction_ids = usecase.getElementIds(params[:elements_filter], Reaction)
        wellplate_ids = usecase.getElementIds(params[:elements_filter], Wellplate)

        top_secret_sample = Sample.where(id: sample_ids).pluck(:is_top_secret).any?
        top_secret_reaction = Reaction.where(id: reaction_ids).flat_map(&:samples).map(&:is_top_secret).any?
        top_secret_wellplate = Wellplate.where(id: wellplate_ids).flat_map(&:samples).map(&:is_top_secret).any?

        is_top_secret = top_secret_sample || top_secret_wellplate || top_secret_reaction

        {is_top_secret: is_top_secret}
      end
    end
  end
end
