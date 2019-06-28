class RebuildReactionType < ActiveRecord::Migration

  def up
    # convert
    list = Reaction.where('rxno is not null and rxno <> \'\'')
    list.each do |rs|
      rxno = rs.rxno.split('|')[0].strip + ' | ' + rs.rxno.split('|')[1].strip
      # use update_columns to bypass updated_at
      rs.update_columns(rxno: rxno)
    end
  end

  def down
    # revert
    list = Reaction.where('rxno is not null and rxno <> \'\'')
    list.each do |rs|
      rxno = rs.rxno.split('|')[0].strip + '|' + rs.rxno.split('|')[1].strip
      # use update_columns to bypass updated_at
      rs.update_columns(rxno: rxno)
    end
  end
end
