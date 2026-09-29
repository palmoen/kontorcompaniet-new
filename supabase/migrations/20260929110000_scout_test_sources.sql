-- ============================================================================
-- Møbelscout: testkilder og nettside-adapter.
-- «test» = intern test før avklaring med kilden. Kan kjøres (kun når nettstedet
-- ikke er i produksjon – håndheves i appen), men treff derfra kan ALDRI
-- godkjennes, vises eller sendes til kunder – håndheves her i databasen.
-- ============================================================================

alter table scout.sources drop constraint sources_adapter_check;
alter table scout.sources add constraint sources_adapter_check
  check (adapter in ('mock', 'manual', 'own_stock', 'feed', 'api', 'web'));

alter table scout.sources drop constraint sources_legal_status_check;
alter table scout.sources add constraint sources_legal_status_check
  check (legal_status in ('not_assessed', 'test', 'approved', 'rejected'));

alter table scout.sources drop constraint sources_check;
alter table scout.sources add constraint sources_active_requires_assessment
  check (not is_active or legal_status in ('approved', 'test'));

-- Kunden ser bare treff med status approved/presented/interested/rejected (scout.result_v).
-- Et treff kan bare komme dit fra en godkjent kilde.
create or replace function scout.guard_customer_match() returns trigger
language plpgsql security definer set search_path = scout, pg_temp as $$
begin
  if new.status in ('approved', 'presented', 'interested')
     and not exists (select 1 from scout.items i join scout.sources s on s.id = i.source_id
                     where i.id = new.item_id and s.legal_status = 'approved') then
    raise exception 'Treff fra en kilde som ikke er godkjent kan ikke vises til kunder' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function scout.guard_customer_match() from public, anon, authenticated;

create trigger matches_customer_guard before insert or update of status on scout.matches
  for each row execute function scout.guard_customer_match();
