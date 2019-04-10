Rails.application.routes.draw do
  devise_for :users, controllers: { registrations: 'users/registrations' }

  authenticated :user, lambda {|u| u.type == "Admin"} do
    root to: 'pages#admin', as: :admin_root
    get 'admin', to: 'pages#admin'
  end

  authenticated :user do
    root to: redirect('mydb'), as: :authenticated_root
  end

  authenticate :user do
    get 'pages/settings', to: 'pages#settings'
    get 'pages/profiles', to: 'pages#profiles'
    patch 'pages/update_profiles', to: 'pages#update_profiles'
    patch 'pages/update_user', to: 'pages#update_user'
    get 'pages/affiliations', to: 'pages#affiliations'
    patch 'pages/create_affiliation', to: 'pages#create_affiliation'
    patch 'pages/update_affiliations', to: 'pages#update_affiliations'

    get 'command_n_control', to: 'pages#cnc'
    get 'mydb/*any', to: 'pages#welcome'
    get 'mydb', to: 'pages#welcome'
  end

  # Standalone page for ChemScanner
  get 'chemscanner', to: 'pages#chemscanner'
  get 'editor',      to: 'pages#editor'

  # Standalone page for ChemSpectra
  get 'chemspectra', to: 'pages#chemspectra'

  get 'home', to: 'pages#home'
  get 'about', to: 'pages#about'
  get 'command_n_control', to: 'pages#home'

  get 'admin', to: 'pages#home'

  mount API => '/'

  root to: redirect('home')

  get 'test', to: 'pages#test'
end
