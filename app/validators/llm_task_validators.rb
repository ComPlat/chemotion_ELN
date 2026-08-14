# frozen_string_literal: true

# Namespace for the validators that check an LLM task's JSON output.
#
# Each validator receives the parsed JSON (Hash or Array) returned by the model
# and either returns it — possibly after normalisation — or raises
# ValidationError if the output is structurally unusable.
#
# Validators are referenced by class-name string in each task's YAML:
#   validator_class: "LlmTaskValidators::SdsExtractionValidator"
#
# and resolved at run time by LlmTaskRunner#apply_validator!, which logs and
# skips validation when the named class does not exist. That means a task can
# ship its validator independently of the runner.
#
# One class per file, under app/validators/llm_task_validators/, named after the
# task it validates. Keeping them separate matters in practice: task definitions
# arrive on independent feature branches, and a single shared file turns every
# new task into a merge conflict in the same twenty lines.
#
# All validators expose the same interface:
#   LlmTaskValidators::SomeName.validate!(parsed_json)  # => json, or raises
#
module LlmTaskValidators
  # Raised when the model's JSON output does not meet the task's structural
  # requirements. LlmTaskRunner wraps this in Errors::LlmProviderError.
  class ValidationError < StandardError; end
end
