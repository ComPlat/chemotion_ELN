module Chemotion
  class UserAPI < Grape::API
    resource :users do
      desc "Return current_user"
      
      get do
        User.all
      end

      get 'current' do
        current_user
      end

    end
  end
end