# rubocop:disable Metrics/BlockLength, Layout/LineLength, Style/FrozenStringLiteralComment
#
Rails.application.routes.draw do
  post '/graphql', to: 'graphql#execute' unless Rails.env.production?

  if ENV['DEVISE_DISABLED_SIGN_UP'].presence == 'true'
    devise_for :users, controllers: { registrations: 'users/registrations', omniauth_callbacks: 'users/omniauth' }, skip: [:registrations]
    as :user do
      get 'sign_in' => 'devise/sessions#new'
      get 'users/sign_up' => 'devise/sessions#new', as: 'new_user_registration'
      get 'users/edit' => 'devise/registrations#edit', as: 'edit_user_registration'
      get 'users/confirmation/new' => 'devise/sessions#new', as: 'new_confirmation'
      put 'users' => 'devise/registrations#update', :as => 'user_registration'
    end
  else
    devise_for :users, controllers: { registrations: 'users/registrations', omniauth_callbacks: 'users/omniauth' }
  end

  authenticated :user, ->(u) { u.type == 'Admin' } do
    root to: 'pages#admin', as: :admin_root
    get 'admin', to: 'pages#admin'
    get 'mydb/*any', to: 'pages#admin'
    get 'mydb', to: 'pages#admin'
  end

  authenticated :user, ->(u) { u.type == 'Group' } do
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
    get 'sfn_cb', to: 'pages#sfn_cb'
    get 'command_n_control', to: 'pages#cnc'
    get 'mydb/*any', to: 'pages#welcome'
    get 'mydb', to: 'pages#welcome'
    get 'molecule_moderator', to: 'pages#molecule_moderator'
    get 'converter_admin', to: 'pages#converter_admin'
    get 'generic_elements_admin', to: 'pages#gea'
    get 'generic_segments_admin', to: 'pages#gsa'
    get 'generic_datasets_admin', to: 'pages#gda'
  end

  # Standalone page for ChemScanner
  get 'chemscanner', to: 'pages#chemscanner'
  get 'editor',      to: 'pages#editor'

  # Standalone page for ChemSpectra
  get 'chemspectra', to: 'pages#chemspectra'
  get 'chemspectra-editor', to: 'pages#chemspectra_editor'

  # route for the radar oauth callback
  namespace :oauth do
    get 'radar/archive', to: 'radar#archive'
    get 'radar/callback', to: 'radar#callback'
    get 'radar/select', to: 'radar#select'
    post 'radar/select', to: 'radar#select'
    get 'radar/export', to: 'radar#export'
  end

  get 'home', to: 'pages#home'
  get 'about', to: 'pages#about'
  get 'command_n_control', to: 'pages#home'

  get 'admin', to: 'pages#home'

  mount API => '/'

  mount GrapeSwaggerRails::Engine => '/swagger'

  root to: redirect('home')

  get 'test', to: 'pages#test'
end

# rubocop: enable Metrics/BlockLength, Layout/LineLength, Style/FrozenStringLiteralComment
