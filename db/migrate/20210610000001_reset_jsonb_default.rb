class ResetJsonbDefault < ActiveRecord::Migration[4.2]
 # class Prediction < ActiveRecord::Base
 # end
 # class Matrice < Activerecord::Base
 # end
 # class Sample < ActiveRecord::Base
 # end
 # class ComputedProp < Activerecord::Base
 # end

  def change
    change_column_default(:predictions, :decision, {})
    change_column_default(:matrices, :configs, {})
    change_column_default(:samples, :xref, {})
    change_column_default(:computed_props, :tddft, {})
    change_column_default(:profiles, :data, {})
    change_column_null(:profiles, :data, false, {})
    change_column_default(:reactions, :temperature, { "valueUnit" => "°C", "userText": "", "data": [] })
  end
end

