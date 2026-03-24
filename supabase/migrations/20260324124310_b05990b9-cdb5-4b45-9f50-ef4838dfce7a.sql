UPDATE firmalar
SET firma_hakkinda = regexp_replace(
  firma_hakkinda,
  '\[/?[a-zA-Z][^\]]*\]',
  '',
  'g'
),
updated_at = now()
WHERE firma_hakkinda ~ '\[/?[a-zA-Z]';