# frozen_string_literal: true

class MixtureComponent < ApplicationRecord
  belongs_to :sampleable, polymorphic: true
  belongs_to :component, class_name: 'Sample', foreign_key: 'component_id'
end
