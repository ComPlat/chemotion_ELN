# frozen_string_literal: true

class DatacollectorObject
  attr_reader :name, :path, :sftp

  def initialize(path, sftp)
    @path = path
    @recipient_abbr = @path.split('/').last.split('-').first
    @name = @path.split('/').last
    @sftp = sftp
  end

  def recipient
    User.try_find_by_name_abbreviation @recipient_abbr
  end
end
