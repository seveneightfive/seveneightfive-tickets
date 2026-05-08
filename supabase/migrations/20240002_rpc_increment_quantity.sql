-- Atomic increment of quantity_sold on ticket_types
create or replace function increment_ticket_quantity_sold(
  p_ticket_type_id uuid,
  p_quantity integer
) returns void
language plpgsql security definer
as $$
begin
  update ticket_types
  set quantity_sold = quantity_sold + p_quantity
  where id = p_ticket_type_id;
end;
$$;
