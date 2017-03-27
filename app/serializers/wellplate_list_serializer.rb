class WellplateListSerializer
end

class WellplateListSerializer::Level10 < WellplateSerializer::Level10
  include WellplateLevelListSerializable
  list_restricted_methods
end

class WellplateListSerializer::Level0 < WellplateSerializer::Level0
  include WellplateLevelListSerializable
  list_restricted_methods
end

class WellplateListSerializer::Level1 < WellplateSerializer::Level1
  include WellplateLevelListSerializable
  list_restricted_methods
end
