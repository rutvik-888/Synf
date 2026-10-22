/*
# Add crew-read-assigned-events policy (deferred from 0001)

Resolves the circular FK reference between events and crew_assignments.
Now that both tables exist, crew members can read events they are assigned to.
*/
drop policy if exists "crew_read_assigned_events" on public.events;
create policy "crew_read_assigned_events" on public.events
  for select to authenticated using (
    exists (select 1 from public.crew_assignments ca where ca.user_id = auth.uid() and ca.event_id = events.id)
  );
