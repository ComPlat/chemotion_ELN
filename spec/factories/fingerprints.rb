FactoryBot.define do
  factory :fingerprint do
    fp0 { Fingerprint.generate_sample_fingerprint }
    fp1 { Fingerprint.generate_sample_fingerprint }
    fp2 { Fingerprint.generate_sample_fingerprint }
    fp3 { Fingerprint.generate_sample_fingerprint }
    fp4 { Fingerprint.generate_sample_fingerprint }
    fp5 { Fingerprint.generate_sample_fingerprint }
    fp6 { Fingerprint.generate_sample_fingerprint }
    fp7 { Fingerprint.generate_sample_fingerprint }
    fp8 { Fingerprint.generate_sample_fingerprint }
    fp9 { Fingerprint.generate_sample_fingerprint }
    fp10 { Fingerprint.generate_sample_fingerprint }
    fp11 { Fingerprint.generate_sample_fingerprint }
    fp12 { Fingerprint.generate_sample_fingerprint }
    fp13 { Fingerprint.generate_sample_fingerprint }
    fp14 { Fingerprint.generate_sample_fingerprint }
    fp15 { Fingerprint.generate_sample_fingerprint }

    num_set_bits { Random.rand(0..64) }
  end
end
