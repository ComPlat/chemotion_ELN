class ScreenListSerializer
end

class ScreenListSerializer::Level10 < ScreenSerializer::Level10
  include ScreenLevelListSerializable
  list_restricted_methods
end

class ScreenListSerializer::Level0 < ScreenSerializer::Level0
  include ScreenLevelListSerializable
  list_restricted_methods
end
