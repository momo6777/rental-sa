-- Drop the broken trigger and function.
-- The frontend already handles total_units sync via RPC calls
-- (increment_property_units / decrement_property_units)

drop trigger if exists trg_sync_property_units on units;
drop function if exists sync_property_units;
