# == Schema Information
#
# Table name: reactions_samples
#
#  id          :integer          not null, primary key
#  reaction_id :integer
#  sample_id   :integer
#  reference   :boolean
#  equivalent  :float
#  position    :integer
#  type        :string
#  deleted_at  :datetime
#  waste       :boolean          default(FALSE)
#  coefficient :float            default(1.0)
#
# Indexes
#
#  index_reactions_samples_on_reaction_id  (reaction_id)
#  index_reactions_samples_on_sample_id    (sample_id)
#

class ReactionsPurificationSolventSample < ReactionsSample
  # STI: this file is only here because of rails model autoloading.
  # place all code in app/models/reactions_sample.rb.
end
