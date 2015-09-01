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

      desc "Log out current_user"
      delete 'sign_out' do
        status 204
      end

    end
  end
end
