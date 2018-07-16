namespace :data do
  desc 'Create rinchi & rinchi-keys for Reaction'
  task ver_20180704131215_add_colums_to_reaction: :environment do
    Reaction.find_each do |reaction|
      rinchi_string, rinchi_long_key,
        rinchi_short_key, rinchi_web_key = reaction.invoke_rinchis
      reaction.update_columns(
        rinchi_string: rinchi_string,
        rinchi_long_key: rinchi_long_key,
        rinchi_short_key: rinchi_short_key,
        rinchi_web_key: rinchi_web_key
      )
    end
  end
end
