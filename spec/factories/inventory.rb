# frozen_string_literal: true

FactoryBot.define do
  factory :inventory do
    prefix { 'prefix' }
    name { 'name' }
    counter { 0 }
  end
end
