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
#  show_label  :boolean          default(FALSE), not null
#  created_at  :datetime         default(Fri, 01 Oct 2021 00:00:00 UTC +00:00), not null
#  updated_at  :datetime         default(Fri, 01 Oct 2021 00:00:00 UTC +00:00), not null
#
# Indexes
#
#  index_reactions_samples_on_reaction_id  (reaction_id)
#  index_reactions_samples_on_sample_id    (sample_id)
#

class ReactionsReactantSample < ReactionsSample
  # STI: this file is only here because of rails model autoloading.
  # place all code in app/models/reactions_sample.rb
end
