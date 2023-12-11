# frozen_string_literal: true

module Chemotion
  class MediumActionAPI < Grape::API
    include Grape::Extensions::Hashie::Mash::ParamBuilder
    helpers StrongParamsHelpers

    namespace :media do
      desc 'Options for UI Select Components'
      get :select_options  do
        Medium.all.map { |e| { value: e.id, label: "#{e.sum_formula} #{e.sample_name}" } }
      end
    end
  end
end
