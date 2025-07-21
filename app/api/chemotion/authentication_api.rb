module Chemotion
  class AuthenticationAPI < Grape::API
    namespace :authentication do
      namespace :token do
        desc 'Generate Token'
        params do
          requires :username, type: String, desc: 'Username'
          requires :password, type: String, desc: 'Password'
        end
        post do
          token = Usecases::Authentication::BuildToken.execute!(params)
          error!('401 Unauthorized', 401) if token.blank?

          { token: token }
        end
      end
    end
  end
end
