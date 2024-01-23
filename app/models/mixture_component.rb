# frozen_string_literal: true

class MixtureComponent < ApplicationRecord
  belongs_to :mixture
  belongs_to :sample
end
