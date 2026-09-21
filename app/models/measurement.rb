# frozen_string_literal: true

# == Schema Information
#
# Table name: measurements
#
#  id          :bigint           not null, primary key
#  deleted_at  :datetime
#  description :string           not null
#  metadata    :jsonb
#  source_type :string
#  unit        :string           not null
#  value       :decimal(, )      not null
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  sample_id   :bigint           not null
#  source_id   :bigint
#  well_id     :bigint
#
# Indexes
#
#  index_measurements_on_deleted_at                 (deleted_at)
#  index_measurements_on_sample_id                  (sample_id)
#  index_measurements_on_source_type_and_source_id  (source_type,source_id)
#  index_measurements_on_well_id                    (well_id)
#


class Measurement < ApplicationRecord
  acts_as_paranoid # TODO: klären ob benötigt
  belongs_to :well, optional: true
  belongs_to :sample, optional: false
  belongs_to :source, polymorphic: true

  before_save :strip_whitespaces

  private

  def strip_whitespaces
    self.description.strip!
    self.unit.strip!
    self.source_type.strip! # should not be needed but it's still user input...
  end
end
