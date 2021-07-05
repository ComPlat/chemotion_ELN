class ChangeDataTypeForSolvent < ActiveRecord::Migration[4.2]
  def change
    rename_column :samples, :solvent, :solvent_old
    add_column :samples, :solvent, :jsonb
    Sample.reset_column_information
    Sample.where(solvent: [nil, []]).where.not(solvent_old: [nil, '']).find_each do |sample|
      solvent_string = sample.solvent_old
      next if solvent_string.blank?
      solvent_string.gsub(/nil/, 'null')
                    .gsub(/=>/, ':')
                    .gsub(/\\+/,'')
                    .gsub(/"\{/,'{')
                    .gsub(/\}"/,'}')
                    .gsub(/\[\[+/, '[')
                    .gsub(/\]\]+/, ']')
                                
      next if solvent_string == '[{}]'
 
      begin
        solvent = JSON.parse(solvent_string) 
        sample.update_columns(solvent: solvent) 
      rescue JSON::ParserError, TypeError
        File.write('failed_sample_solvent.log', "#{sample.id}: #{sample.solvent_old}\n", mode: 'a')
      end
    end

    remove_column :samples, :solvent_old, :string
    Sample.reset_column_information
  end
end
