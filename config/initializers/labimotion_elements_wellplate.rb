# frozen_string_literal: true

# WORKAROUND for a bug in the labimotion gem (present in 2.3.0.rc6 and 2.3.0 final),
# surfaced by the Rails 7.2 upgrade.
#
# lib/labimotion/models/elements_wellplate.rb declares
#
#   module Labimotion
#     class ElementsWellplate < ApplicationRecord
#       belongs_to :wellplate
#
# without a class_name. Inside the Labimotion namespace, Rails resolves that to
# Labimotion::Wellplate — and the gem itself registers `autoload :Wellplate` for a
# class that is not an ActiveRecord model. Every use of the association raises
#
#   ArgumentError: The Wellplate model class for the
#   Labimotion::ElementsWellplate#wellplate association is not an ActiveRecord::Base subclass.
#
# which is what the 5 examples in spec/api/chemotion/wellplate_api_generic_element_spec.rb
# hit. The one-line fix belongs in the gem (`class_name: '::Wellplate'`); a report is
# ready in the planning repo (korrespondenz/2026-09-03-labimotion-wellplate-bug.md).
# Remove this file once a labimotion release carries that fix.
#
# Why `optional: true`: re-declaring a belongs_to replaces the reflection but does NOT
# remove the presence validator the gem's original declaration added (belongs_to is
# required by default). Re-declaring without `optional: true` would stack a second
# validator and double every "must exist" error. With it, the gem's single validator
# stays and now reads the association through the corrected reflection.
#
# to_prepare, because the gem model is loaded late and this must re-apply after a
# code reload in development.
Rails.application.config.to_prepare do
  Labimotion::ElementsWellplate.belongs_to :wellplate, class_name: '::Wellplate', optional: true
end
