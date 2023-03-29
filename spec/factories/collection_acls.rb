# frozen_string_literal: true

FactoryBot.define do
  factory :collection_acl do
    label { 'Shared with Test User' }
    callback(:before_create) do |acl|
      acl.collection = FactoryBot.build(:collection) unless acl.collection
      acl.user = FactoryBot.build(:user) unless acl.user
    end
  end
end
