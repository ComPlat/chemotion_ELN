# frozen_string_literal: true

# == Schema Information
#
# Table name: provenances
#
#  id                  :uuid             not null, primary key
#  reaction_process_id :uuid
#  starts_at           :datetime
#  city                :string
#  doi                 :string
#  patent              :string
#  publication_url     :string
#  username            :string
#  name                :string
#  orcid               :string
#  organization        :string
#  email               :string
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#

module ReactionProcessEditor
  class Provenance < ApplicationRecord
    belongs_to :reaction_process

    after_initialize :set_rounded_starts_at

    def starts_at=(time)
      super(DateTime.parse(time))
    rescue TypeError, Date::Error
      set_rounded_starts_at
    end

    private

    def set_rounded_starts_at
      return if starts_at.present?

      self[:starts_at] = Time.zone.now.beginning_of_minute
    end
  end
end
