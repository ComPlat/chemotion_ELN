module ElementUIStateScopes

  def self.included(base)
    base.extend(ClassMethods)
  end

  module ClassMethods
    def for_ui_state(ui_state)
      if (ui_state.fetch(:all, false))
        excluded_ids = ui_state.fetch(:excluded_ids, [])
        where.not(id: excluded_ids)
      else
        included_ids = ui_state.fetch(:included_ids,[])
        where(id: included_ids)
      end
    end
  end
end


#L.27
  #include ElementUIStateScopes

  #Sample.where(user_id: 1).for_ui_state(..)


