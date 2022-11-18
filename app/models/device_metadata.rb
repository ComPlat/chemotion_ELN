# == Schema Information
#
# Table name: device_metadata
#
#  id                      :integer          not null, primary key
#  device_id               :integer
#  doi                     :string
#  url                     :string
#  landing_page            :string
#  name                    :string
#  type                    :string
#  description             :string
#  publisher               :string
#  publication_year        :integer
#  manufacturers           :jsonb
#  owners                  :jsonb
#  dates                   :jsonb
#  created_at              :datetime         not null
#  updated_at              :datetime         not null
#  deleted_at              :datetime
#  doi_sequence            :integer
#  data_cite_prefix        :string
#  data_cite_created_at    :datetime
#  data_cite_updated_at    :datetime
#  data_cite_version       :integer
#  data_cite_last_response :jsonb
#  data_cite_state         :string           default("draft")
#  data_cite_creator_name  :string
#
# Indexes
#
#  index_device_metadata_on_deleted_at  (deleted_at)
#  index_device_metadata_on_device_id   (device_id)
#

class DeviceMetadata < ApplicationRecord
  self.inheritance_column = nil
  acts_as_paranoid
  DATA_CITE_PREFIX = ENV['DATA_CITE_PREFIX']
  DATA_CITE_DEVICE_PREFIX = ENV['DATA_CITE_DEVICE_PREFIX']

  belongs_to :device, optional: true

  validates :doi, uniqueness: true, if: -> { doi.present? }
  validates :doi_sequence, uniqueness: true, if: -> { doi_sequence.present? }

  validates :url, presence: true, if: -> { data_cite_state.in?(%w[registered findable]) }
  validates :publication_year, presence: true, if: -> { data_cite_state.in?(%w[registered findable]) }

  ALLOWED_DATACITE_STATE_TRANSITIONS = {
    'draft' => %w[draft registered],
    'registered' => %w[registered findable],
    'findable' => %w[findable]
  }.freeze

  def data_cite_state=(new_state)
    return unless ALLOWED_DATACITE_STATE_TRANSITIONS.fetch(data_cite_state, []).include?(new_state)

    super(new_state)
  end

  def generate_doi!
    doi_sequence = (self.class.maximum(:doi_sequence) || 0) + 1
    doi = "#{DATA_CITE_PREFIX}/#{DATA_CITE_DEVICE_PREFIX}#{doi_sequence}"
    update!(
      doi: doi,
      doi_sequence: doi_sequence,
      data_cite_prefix: DATA_CITE_PREFIX
    )
  end
end
