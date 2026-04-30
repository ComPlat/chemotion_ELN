# frozen_string_literal: true

module Chemotion
  class I18nAPI < Grape::API
    namespace :public do
      namespace :i18n do
        desc 'List available UI locales (top-level files in public/i18n/)'
        get :locales do
          Rails.root.join('public/i18n').glob('*.json').map { |path| path.basename('.json').to_s }.sort
        end
      end
    end
  end
end
