class ChangeXrefCasDatatype < ActiveRecord::Migration[6.1]
  def change
    Sample.where(xref: nil).find_each do |sample|
      sample.update_columns(xref: {})
    end

    Sample.where("xref ? 'cas'").find_each do |s|
      if s.xref['cas'].nil?
        s.update_columns(xref: xref.compact!)
      elsif s.xref['cas'].has_key?('value')
        s.update_columns(xref: {'cas': "#{s.xref['cas']['value']}"})
      end
    end
  end
end
