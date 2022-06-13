# frozen_string_literal: true

# app/graphql/types/sample_type.rb
module Types
  class SampleType < Types::BaseObject
    description 'A sample'
    field :id, Integer, null: false
    field :name, String, null: false
    field :short_label, String
    field :location, String
    field :target_amount_value, Float
    field :target_amount_unit, String
  end
end
