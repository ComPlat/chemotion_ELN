Rails.application.routes.draw do
  devise_for :users

  authenticated :user do
    root to: 'pages#welcome', as: :authenticated_root
  end

  mount Chemotion::Api => '/'

  root :to => redirect("/users/sign_in")

  get 'test', to: 'pages#test'
end
