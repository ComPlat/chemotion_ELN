class ChangeXrefCasDatatype < ActiveRecord::Migration[6.1]
  def change
    Sample.find_each do |sample|
      if sample.xref['cas']
        sample.xref['cas'] = sample.xref['cas']['value']
        sample.save!
      end
    end
  end
end
