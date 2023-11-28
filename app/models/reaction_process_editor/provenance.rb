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

    def initialize(*args)
      super
      set_rounded_starts_at
    end

    def starts_at=(time)
      super(DateTime.parse(time))
    rescue TypeError, Date::Error
      super(Time.zone.now)
    end

    private

    def set_rounded_starts_at
      return if starts_at.present?

      round_to = 60.to_f # seconds, i.e. 1 minutes.
      self[:starts_at] = Time.zone.at((Time.zone.now.to_i / round_to).floor * round_to).to_s
    end
  end
end
