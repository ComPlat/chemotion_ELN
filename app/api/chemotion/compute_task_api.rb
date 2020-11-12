module Chemotion
  class ComputeTaskAPI < Grape::API
    resource :compute_task do
      get :all, each_serializer: ComputedPropsSerializer do
        ComputedProp.where(creator: current_user.id)
      end
    end
  end
end
