# == Schema Information
#
# Table name: collector_errors
#
#  id         :integer          not null, primary key
#  error_code :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

# Register if a file/folder could not be fully processed by the Collector
# so that the same target is not processed again in the future.
# (For example when the target can not be deleted)
class CollectorError < ApplicationRecord
  # Find a record by path
  # @param file_path [String] The file path
  # @param mtime [Time] Timestamp
  # @return [CollectorError]
  def self.find_by_path(path, mtime)
    error_code = digest(path, mtime)
    find_by(error_code: error_code)
  end

  # Find or create a record by path
  # (see #self.find_or_create_by_path)
  def self.find_or_create_by_path(path, mtime = nil)
    error_code = digest(path, mtime)
    find_or_create_by(error_code: error_code)
  end

  # Generate a hash from file_path and modified_at timestamp that can be used for error tracking
  # @param (see #find_by_path)
  # @return [String] the digest
  def self.digest(path, mtime)
    # Digest::SHA256.hexdigest(path + date.to_s)
    Digest::SHA256.hexdigest(path + mtime.to_i.to_s)
  end
end
