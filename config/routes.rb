Rails.application.routes.draw do
  devise_for :users

  authenticated :user do
    root to: 'pages#welcome', as: :authenticated_root
    get 'pages/settings', to: 'pages#settings'
  end

  mount API => '/'
  mount Scifinding::Engine => 'scifi'

  root :to => redirect("/users/sign_in")

  get 'test', to: 'pages#test'
end
