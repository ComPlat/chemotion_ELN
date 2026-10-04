# frozen_string_literal: true

module Usecases
  module Attachments
    # Decides whether a user may read or change an attachment. The single rule shared by the
    # attachment API, the third-party-app and editor endpoints, and the report worker.
    #
    # The element is resolved through {Attachment#root_element}, which covers attachments in an
    # analysis container as well as ones linked directly to an element (ResearchPlan, Wellplate,
    # DeviceDescription, SBMM, ...). Policy results are memoized per root element, so one
    # instance can be reused across the attachments of a request.
    class Access
      # @param user [User, nil] the acting user
      def initialize(user)
        @user = user
        @results = {}
        @roots = {}
      end

      # @param attachment [Attachment, nil]
      # @return [Boolean]
      def read?(attachment)
        return false if attachment.blank? || @user.nil?
        return own_unattached?(attachment) if attachment.attachable_id.nil?

        read_element?(root_of(attachment))
      end

      # On a SequenceBasedMacromolecule another user has a sample of, only the uploader may change
      # an attachment, also once they no longer have a sample of it: the SBMM is a shared reference
      # record, and update? passes for anyone owning one of its samples
      # (see {Usecases::Sbmm::Sample#raise_if_sbmm_is_not_writable!}).
      #
      # @param attachment [Attachment, nil]
      # @return [Boolean]
      def write?(attachment)
        return false if attachment.blank? || @user.nil?
        return own_unattached?(attachment) if attachment.attachable_id.nil?

        write_on_element?(attachment, root_of(attachment))
      end

      # Read access to an element's attachments: the element itself and its datasets.
      #
      # @param element [ApplicationRecord, User, nil]
      # @return [Boolean]
      def read_element?(element)
        return false if @user.nil?
        return own_user_element?(element) if element.nil? || element.is_a?(User)

        cached(element, :read) do
          policy = ElementPolicy.new(@user, element)
          policy.read? && policy.read_dataset?
        end
      end

      private

      # Attachments on one attachable share their root element; resolve it once per attachable.
      def root_of(attachment)
        return attachment.root_element unless attachment.root_element_from_attachable?

        key = [attachment.attachable_type, attachment.attachable_id]
        return @roots[key] if @roots.key?(key)

        @roots[key] = attachment.root_element
      end

      # On a shared SBMM the uploader decides, before ElementPolicy#update?: they keep write access to
      # their own files after removing their own sample of it, since nobody else may change them.
      def write_on_element?(attachment, element)
        return own_user_element?(element) if element.nil? || element.is_a?(User)
        return attachment.created_for == @user.id if shared_sbmm?(element)

        cached(element, :update) { ElementPolicy.new(@user, element).update? }
      end

      # Unsorted inbox files and detached files have no element to authorize against; they belong
      # to the user they were created for. Keyed on attachable_id, not on a nil root_element, so an
      # attachment whose element was deleted does not fall back to its uploader.
      def own_unattached?(attachment)
        attachment.created_for == @user.id
      end

      # Device-box inbox files and Report/Template attachments resolve to a User. Compared by id:
      # an Admin is a User subclass, which ActiveRecord's == would tell apart.
      def own_user_element?(element)
        element.is_a?(User) && element.id == @user.id
      end

      def shared_sbmm?(element)
        element.is_a?(SequenceBasedMacromolecule) &&
          cached(element, :shared) { element.used_by_other_users?(@user) }
      end

      def cached(element, check)
        key = [element.class.name, element.id, check]
        return @results[key] if @results.key?(key)

        @results[key] = yield
      end
    end
  end
end
