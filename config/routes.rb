Rails.application.routes.draw do
  devise_for :users, controllers: { registrations: 'users/registrations' }

  authenticated :user do
    root to: 'pages#welcome', as: :authenticated_root
    get 'pages/settings', to: 'pages#settings'
    get 'pages/profiles', to: 'pages#profiles'
    patch 'pages/update_profiles', to: 'pages#update_profiles'
    patch 'pages/update_user', to: 'pages#update_user'
    get 'pages/groups', to: 'pages#groups'
    get 'pages/affiliations', to: 'pages#affiliations'
    patch 'pages/create_affiliation', to: 'pages#create_affiliation'
    patch 'pages/update_affiliations', to: 'pages#update_affiliations'

    # Standalone page for docx processing
    # get 'docx', to: 'pages#docx'
    get 'docx', to: 'pages#chemread'
    get 'command_n_control', to: 'pages#cnc'
  end

  get 'home', to: 'pages#home'
  get 'command_n_control', to: 'pages#home'

  mount API => '/'

  root to: redirect('home')

  get 'test', to: 'pages#test'
end
