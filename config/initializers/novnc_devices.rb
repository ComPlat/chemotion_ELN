# frozen_string_literal: true

# Ensure the novnc_devices directory exists for storing device connection status
NOVNC_DEVICES_DIR = Rails.root.join('tmp/novnc_devices')

Rails.application.config.after_initialize do
  FileUtils.mkdir_p(NOVNC_DEVICES_DIR)
end
