# frozen_string_literal: true

class Micromolecule < ApplicationRecord
  has_one :sample, as: :sampleable
end
