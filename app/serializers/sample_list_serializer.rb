class SampleListSerializer
end

class SampleListSerializer::Level10 < SampleSerializer::Level10
  include SampleLevelListSerializable
  list_restricted_methods
end

class SampleListSerializer::Level0 < SampleSerializer::Level0
  include SampleLevelListSerializable
  list_restricted_methods
  has_one :molecule
end

class SampleListSerializer::Level1 < SampleSerializer::Level1
  include SampleLevelListSerializable
  list_restricted_methods
end

class SampleListSerializer::Level2 < SampleSerializer::Level2
  include SampleLevelListSerializable
  list_restricted_methods
end

class SampleListSerializer::Level3 < SampleSerializer::Level3
  include SampleLevelListSerializable
  list_restricted_methods
end
