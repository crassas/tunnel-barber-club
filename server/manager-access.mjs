// Pre-authorized owner; Google/Neon must verify the account before access.
export async function isManager(sql, sub) {
  const rows = await sql`SELECT u.id FROM neon_auth."user" u
    WHERE u.id::text=${sub} AND u."emailVerified"=true
      AND coalesce(u.banned,false)=false
      AND (lower(u.email)='tunnelbarberclub@gmail.com'
        OR EXISTS (SELECT 1 FROM managers m WHERE m.auth_user_id=u.id::text))`;
  return rows.length > 0;
}
