# frozen_string_literal: true

module Datacollector
  module CorrespondenceHelpers
    # try to find device/user from identifier input
    # @param identifier [String] input string
    # @return [Device, User, Nil] device or user object
    # @note the sender can be a device or a user!
    # @note finding a device is preferred over finding a user!
    # @note that since DEvice are not a subclass of User, we need to check for both
    #   separately and email/name_abbreviation are not unique for both
    def find_sender(identifier)
      find_device(identifier) || find_user(identifier)
    end

    # try to find the recipient from identifier input
    # @param identifier [String] input string
    # @return [User, Nil] user
    # @note the receiver can only be a user!
    # alias_method :find_recipient, :find_user
    def find_recipient(identifier)
      find_user(identifier)
    end

    # Validate the sender or recipient
    # @param obj [User, Device, Nil] The object to check
    # @return [Boolean] True if the object is an active User or a Device
    def validate(obj)
      case obj
      when Person, Group
        obj.account_active
      when Device
        true
      else
        false
      end
    end

    # Find a device by email or name abbreviation
    # @param [String] The email or name abbreviation
    def find_device(raw_identifier)
      identifier = parse_identifier(raw_identifier)
      identifier.include?('@') ? Device.by_email(identifier).first : Device.find_by(name_abbreviation: identifier)
    end

    # Find a user by email (insensitive case) or name abbreviation
    # @param [String] The email or name abbreviation
    # @return [User, Nil] The user object (Person or Group) or nil if not found
    # @note if case sensitive name abbreviation, the user will not be found
    def find_user(raw_identifier)
      identifier = parse_identifier(raw_identifier)
      scope = User.where(type: %w[Person Group])
      return scope.by_email(identifier).first if identifier.include?('@')

      scope.by_exact_name_abbreviation(identifier).first || scope.by_exact_name_abbreviation(identifier, true).first
    end

    private

    # Parse the info string to extract email or name abbreviation
    #  can be path like: /path/to/email@address or /path/AB-folder-name with AB as name abbreviation
    #  @note `@` and `-` is not allowed in name abbreviation
    #  @param  [String] The input string
    #  @return [String] The email or name abbreviation
    #  @todo: should consider potential customized regex as set in config/user_props.yml
    #    see User#name_abbreviation_format
    def parse_identifier(info)
      # remove potential path
      info = info.split('/').last.strip
      # check if email
      info.include?('@') ? info : info.split('-').first.strip
    end
  end
end
