-- Add sequential contract number (A-00001, A-00002, ...)
alter table contracts
  add column contract_number text;

-- Create sequence for contract numbers
create sequence if not exists contract_number_seq start 1;

-- Function to auto-generate contract number on insert
create or replace function generate_contract_number()
returns trigger as $$
declare
  next_num bigint;
begin
  next_num := nextval('contract_number_seq');
  new.contract_number := 'A-' || lpad(next_num::text, 5, '0');
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-generate contract number before insert
drop trigger if exists trg_generate_contract_number on contracts;
create trigger trg_generate_contract_number
  before insert on contracts
  for each row
  when (new.contract_number is null)
  execute function generate_contract_number();

-- Backfill existing contracts with sequential numbers
do $$
declare
  r record;
  num bigint;
begin
  num := 1;
  for r in select id from contracts where contract_number is null order by created_at, id loop
    update contracts set contract_number = 'A-' || lpad(num::text, 5, '0') where id = r.id;
    num := num + 1;
  end loop;
  -- Sync the sequence to the max used number
  perform setval('contract_number_seq', num - 1);
end;
$$;
