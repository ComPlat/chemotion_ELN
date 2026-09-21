# frozen_string_literal: true

# STI placeholder so ActiveRecord can still instantiate legacy user rows whose `type`
# column is 'DeviceDeprecated' (from de-typing deleted user-devices, #2458). Kept in its
# own file — like Admin — so Zeitwerk manages and reloads it; defining it inline in
# user.rb left it unmanaged and caused a superclass mismatch on dev code reload.
class DeviceDeprecated < User
end
