create trigger set_samples_mol_rdkit_trg
    before insert or update on samples
    for each row execute procedure set_samples_mol_rdkit();
