module Chemotion
  class ProfileAPI < Grape::API
    resource :profiles do

      desc "Return the profile of the current_user"
      get do
        current_user.profile
      end

    end
  end
end
