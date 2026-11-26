# frozen_string_literal: true

# Writes the values of variations converted by 20260731120000_convert_reaction_variations_to_diff_list
# - still kept only under `legacy_data` - into their diff, so the server reads them without every
# reaction having to be opened and saved first. See Usecases::Reactions::ConvertLegacyVariations.
class ConvertLegacyReactionVariationValues < ActiveRecord::Migration[6.1]
  def up
    reactions_with_legacy_variations.find_each do |reaction|
      Usecases::Reactions::ConvertLegacyVariations.new(reaction).perform!
    end
  end

  # Nothing to undo: `legacy_data` is left as it was, which is all the previous migration's `down`
  # reads. Resetting the diffs here would also throw away whatever users changed since, as the
  # converted values cannot be told apart from later edits.
  def down; end

  private

  def reactions_with_legacy_variations
    Reaction.with_deleted
            .where("jsonb_typeof(variations) = 'array'")
            .where("jsonb_path_exists(variations, '$[*] ? (exists(@.legacy_data))')")
  end
end
