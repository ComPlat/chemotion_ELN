Rails.application.routes.draw do
  devise_for :users

  authenticated :user do
    root to: 'pages#welcome', as: :authenticated_root
    get 'pages/settings', to: 'pages#settings'
    get 'pages/profiles', to: 'pages#profiles'
    patch 'pages/update_profiles', to: 'pages#update_profiles'
    get 'pages/groups', to: 'pages#groups'
  end

  mount API => '/'

  root :to => redirect("/users/sign_in")

  get 'test', to: 'pages#test'
end
