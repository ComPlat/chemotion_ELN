Rails.application.routes.draw do
  devise_for :users

  authenticated :user do
    root to: 'pages#welcome', as: :authenticated_root
    get 'pages/settings', to: 'pages#settings'
    get 'pages/profiles', to: 'pages#profiles'
    patch 'pages/update_profiles', to: 'pages#update_profiles'
    patch 'pages/update_user', to: 'pages#update_user'
    get 'pages/groups', to: 'pages#groups'
  end

  get 'home', to: 'pages#home'

  mount API => '/'

  root :to => redirect("home")

  get 'test', to: 'pages#test'
end
