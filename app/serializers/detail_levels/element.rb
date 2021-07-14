class DetailLevels::Element
    def base_attributes
      [
        :id, :type, :name, :properties, :created_by, :created_at, :updated_at, :container, :short_label, :can_copy, :uuid, :klass_uuid
      ]
    end

    def level0_attributes
      base_attributes
    end

    def level1_attributes
      level0_attributes
    end

    def list_removed_attributes
      [
      ]
    end
  end
