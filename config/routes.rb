Rails.application.routes.draw do
  devise_for :users

  authenticated :user do
    root to: 'pages#welcome', as: :authenticated_root
    get 'pages/settings', to: 'pages#settings'
  end

  mount API => '/'

  root :to => redirect("/users/sign_in")

  get 'test', to: 'pages#test'
  get 'ketcher', to: 'ketcher#index'
end
