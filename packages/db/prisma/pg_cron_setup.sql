-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing job if it exists (for idempotency)
SELECT cron.unschedule('process-auto-close-tickets') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-auto-close-tickets'
);

-- Create auto-close job that runs every minute
SELECT cron.schedule(
  'process-auto-close-tickets',
  '* * * * *',  -- Every minute
  $$
  -- Close tickets whose auto-close time has passed
  WITH closed_tickets AS (
    UPDATE tickets 
    SET 
      status = 'CLOSED',
      closed_at = NOW(),
      updated_at = NOW()
    WHERE 
      status = 'OPEN'
      AND auto_close_at IS NOT NULL
      AND auto_close_at <= NOW()
      AND exclude_from_autoclose = false
      AND close_request_id IS NOT NULL
    RETURNING id, close_request_by, close_request_reason
  )
  -- Create lifecycle events for closed tickets
  INSERT INTO ticket_lifecycle_events (
    ticket_id, 
    action, 
    performed_by_id, 
    closed_by_id, 
    close_reason, 
    timestamp
  )
  SELECT 
    id, 
    'auto_closed',
    close_request_by,
    close_request_by,
    COALESCE(close_request_reason, 'Automatically closed due to no response'),
    NOW()
  FROM closed_tickets;
  $$
);

-- Verify job was created
SELECT jobname, schedule, command 
FROM cron.job 
WHERE jobname = 'process-auto-close-tickets';