# frozen_string_literal: true

# Upstream defect: labimotion (<= 2.3.0.rc5) reads
# Labimotion::Prop::CONVERTER_FIELD_UINT_PREFIX in Converter.update_ds but never defines it,
# so every converter -> generic-dataset field mapping dies with a NameError before a single
# key/value reaches the dataset.
#
# '___unit___' is the prefix converter-app emits for unit identifiers
# (converter_app/converters.py, +outputKey.startswith('___unit___')+).
#
# Remove once the gem ships the constant; labimotion 2.4.x dropped the unit branch entirely,
# so re-check Converter.update_ds before deleting this file on a major bump.
Labimotion::Prop.const_set(:CONVERTER_FIELD_UINT_PREFIX, '___unit___') unless
  Labimotion::Prop.const_defined?(:CONVERTER_FIELD_UINT_PREFIX)
