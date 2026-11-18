# frozen_string_literal: true

# == Schema Information
#
# Table name: info_support_links
#
#  id         :bigint           not null, primary key
#  enabled    :boolean          default(TRUE), not null
#  label      :string           not null
#  position   :integer          default(0), not null
#  url        :string           not null
#  created_at :datetime         not null
#  updated_at :datetime         not null
#
class InfoSupportLink < ApplicationRecord
  URL_FORMAT = %r{\Ahttps?://.+}i.freeze

  validates :label, presence: true, length: { maximum: 255 }
  validates :url, presence: true, length: { maximum: 2048 }, format: { with: URL_FORMAT }

  scope :enabled, -> { where(enabled: true) }
  scope :ordered, -> { order(:position, :id) }

  default_scope { ordered }
end
