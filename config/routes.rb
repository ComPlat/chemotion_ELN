Rails.application.routes.draw do
  devise_for :users

  authenticated :user do
    root to: 'pages#welcome', as: :authenticated_root
  end

  root :to => redirect("/users/sign_in")
end
