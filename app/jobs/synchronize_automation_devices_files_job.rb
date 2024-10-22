# frozen_string_literal: true

# Job to sync with an SFTP server
# Downloads Devices CSV files defining the Devices currently available in the automation lab.

class SynchronizeAutomationDevicesFilesJob < ApplicationJob
  def perform
    Usecases::ReactionProcessEditor::SFTP::SynchronizeDevices.execute!
  end
end
