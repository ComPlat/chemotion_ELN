Rails.application.routes.draw do
  if ENV['DEVISE_DISABLED_SIGN_UP'].presence == 'true'
    devise_for :users, controllers: { registrations: 'users/registrations' }, skip: [:registrations]
    as :user do
      get 'sign_in' => 'devise/sessions#new'
      get 'users/sign_up' => 'devise/sessions#new', as: 'new_user_registration'
      get 'users/edit' => 'devise/registrations#edit', as: 'edit_user_registration'
      get 'users/confirmation/new' => 'devise/sessions#new', as: 'new_confirmation'
      put 'users' => 'devise/registrations#update', :as => 'user_registration'
    end
  else
    devise_for :users, controllers: { registrations: 'users/registrations' }
  end

  authenticated :user, lambda {|u| u.type == "Admin"} do
    root to: 'pages#admin', as: :admin_root
    get 'admin', to: 'pages#admin'
    get 'mydb/*any', to: 'pages#admin'
    get 'mydb', to: 'pages#admin'
  end


  authenticated :user, lambda {|u| u.type == "Group"} do
    root to: 'pages#cnc', as: :group_root
    get 'group', to: 'pages#cnc'
    get 'mydb/*any', to: 'pages#cnc'
    get 'mydb', to: 'pages#cnc'
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
    get 'molecule_moderator', to: 'pages#molecule_moderator'
  end

  # Standalone page for ChemScanner
  get 'chemscanner', to: 'pages#chemscanner'
  get 'editor',      to: 'pages#editor'

  # Standalone page for ChemSpectra
  get 'chemspectra', to: 'pages#chemspectra'
  # get 'chemspectra-editor', to: 'pages#chemspectra_editor'

  get 'home', to: 'pages#home'
  get 'about', to: 'pages#about'
  get 'command_n_control', to: 'pages#home'

  get 'admin', to: 'pages#home'

  mount API => '/'

  root to: redirect('home')

  get 'test', to: 'pages#test'
end
