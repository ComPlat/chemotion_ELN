# frozen_string_literal: true

# == Schema Information
#
# Table name: reactions_samples
#
#  id                           :integer          not null, primary key
#  reaction_id                  :integer
#  sample_id                    :integer
#  reference                    :boolean
#  equivalent                   :float
#  position                     :integer
#  type                         :string
#  deleted_at                   :datetime
#  waste                        :boolean          default(FALSE)
#  coefficient                  :float            default(1.0)
#  show_label                   :boolean          default(FALSE), not null
#  reaction_process_activity_id :uuid
#  intermediate_type            :string
#  created_at                   :datetime
#  updated_at                   :datetime
#  gas_type                     :integer          default("off")
#  gas_phase_data               :jsonb
#  conversion_rate              :float
#
# Indexes
#
#  index_reactions_samples_on_reaction_id  (reaction_id)
#  index_reactions_samples_on_sample_id    (sample_id)
#

class ReactionsIntermediateSample < ReactionsSample
  # STI: this file is required for rails model autoloading.
  # place all code in app/models/reactions_sample.rb.
end
