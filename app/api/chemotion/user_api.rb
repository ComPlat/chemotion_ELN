module Chemotion
  class UserAPI < Grape::API
    resource :users do

      desc "Return all users"
      get do
        User.all
      end

      desc "Return current_user"
      get 'current' do
        current_user
      end

    end
  end
end
