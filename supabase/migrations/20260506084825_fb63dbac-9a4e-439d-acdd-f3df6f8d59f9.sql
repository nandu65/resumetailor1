CREATE OR REPLACE FUNCTION public.consume_scan(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  prof RECORD;
  limit_for_plan int;
  now_ts timestamptz := now();
  current_month_start timestamptz := date_trunc('month', now_ts);
  used int;
BEGIN
  SELECT * INTO prof FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'no_profile');
  END IF;

  IF prof.scan_period_start IS NULL OR prof.scan_period_start < current_month_start THEN
    UPDATE public.profiles
       SET scans_used_month = 0,
           scan_period_start = current_month_start
     WHERE user_id = _user_id;
    used := 0;
  ELSE
    used := COALESCE(prof.scans_used_month, 0);
  END IF;

  IF prof.plan = 'pro' THEN
    limit_for_plan := 50;
  ELSIF prof.plan = 'basic' THEN
    limit_for_plan := 10;
  ELSE
    limit_for_plan := 1; -- free => 1 lifetime/monthly scan
  END IF;

  IF limit_for_plan IS NOT NULL AND used >= limit_for_plan THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'limit_reached',
      'plan', prof.plan,
      'used', used,
      'limit', limit_for_plan
    );
  END IF;

  UPDATE public.profiles
     SET scans_used_month = used + 1
   WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'plan', prof.plan,
    'used', used + 1,
    'limit', limit_for_plan
  );
END;
$function$;