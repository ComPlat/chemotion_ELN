create or replace function set_samples_mol_rdkit()
returns trigger as
$FUNC$
begin
	if (TG_OP='INSERT') then
		new.mol_rdkit := mol_from_ctab(encode(new.molfile, 'escape')::cstring);
	end if;
	if (TG_OP='UPDATE') then
		if new.MOLFILE <> old.MOLFILE then
			new.mol_rdkit := mol_from_ctab(encode(new.molfile, 'escape')::cstring);
		end if;
	end if;
	return new;
end
$FUNC$ language plpgsql;
