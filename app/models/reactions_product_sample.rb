# == Schema Information
#
# Table name: reactions_samples
#
#  id                          :integer          not null, primary key
#  coefficient                 :float            default(1.0)
#  conversion_rate             :float
#  deleted_at                  :datetime
#  equivalent                  :float
#  gas_phase_data              :jsonb
#  gas_type                    :integer          default("off")
#  position                    :integer
#  reference                   :boolean
#  show_label                  :boolean          default(FALSE), not null
#  type                        :string
#  waste                       :boolean          default(FALSE)
#  weight_percentage           :float
#  weight_percentage_reference :boolean          default(FALSE)
#  created_at                  :datetime
#  updated_at                  :datetime
#  reaction_id                 :integer
#  sample_id                   :integer
#
# Indexes
#
#  index_reactions_samples_on_reaction_id  (reaction_id)
#  index_reactions_samples_on_sample_id    (sample_id)
#

class ReactionsProductSample < ReactionsSample
  # STI: this file is only here because of rails model autoloading.
  # place all code in app/models/reactions_sample.rb.
end
