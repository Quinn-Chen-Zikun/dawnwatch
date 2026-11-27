-- 破晓守望 · 可选云存档后端（Supabase Auth + Postgres）
-- 在真实的 Supabase 项目 SQL Editor 中执行一次。
-- 设计目标：
--   * 每个已登录用户只能读写自己的记录（RLS + auth.uid() = user_id）。
--   * 匿名角色没有表权限。
--   * 只授予 select / insert / update；本阶段不提供删除接口。
--   * 网页端只使用 publishable/anon key，不需要 service_role 密钥。
-- 注意：这只是后端 schema，仓库本身不含 Supabase 项目、URL 或任何密钥。

begin;

create table if not exists public.cloud_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null default 'default',
  schema_version integer not null default 1,
  save_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cloud_saves_pkey primary key (user_id, slot),
  constraint cloud_saves_slot_format
    check (slot ~ '^[a-z0-9][a-z0-9_-]{0,31}$'),
  constraint cloud_saves_schema_version_range
    check (schema_version between 1 and 100),
  constraint cloud_saves_save_data_object
    check (jsonb_typeof(save_data) = 'object'),
  constraint cloud_saves_save_data_size
    check (octet_length(save_data::text) <= 131072),
  constraint cloud_saves_time_order
    check (updated_at >= created_at)
);

comment on table public.cloud_saves is
  '破晓守望可选云存档：每个认证用户每个 slot 一条；JSON 上限 128 KiB。';
comment on column public.cloud_saves.save_data is
  '仅包含游戏存档数据，不应写入账号、令牌或身份信息。';
comment on column public.cloud_saves.updated_at is
  '由触发器在服务端写入，客户端提交的值会被覆盖。';

-- 强制服务端更新时间，并禁止通过 UPDATE 改变 user_id / created_at。
create or replace function public.cloud_saves_touch_times()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'cloud_saves.user_id cannot be changed';
    end if;
    if new.created_at is distinct from old.created_at then
      new.created_at := old.created_at;
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists cloud_saves_touch_times on public.cloud_saves;
create trigger cloud_saves_touch_times
  before insert or update on public.cloud_saves
  for each row execute function public.cloud_saves_touch_times();

-- 行级安全：客户端只能看到 / 写入 user_id 等于当前 JWT 用户 ID 的行。
alter table public.cloud_saves enable row level security;

-- 先移除匿名、public 与 authenticated 的默认权限，
-- 再只给 authenticated 授予 select / insert / update（不含 delete）。
revoke all on table public.cloud_saves from anon;
revoke all on table public.cloud_saves from public;
revoke all on table public.cloud_saves from authenticated;
grant select, insert, update on table public.cloud_saves to authenticated;

-- 可重复执行：先移除同名策略再创建。
drop policy if exists cloud_saves_select_own on public.cloud_saves;
drop policy if exists cloud_saves_insert_own on public.cloud_saves;
drop policy if exists cloud_saves_update_own on public.cloud_saves;

create policy cloud_saves_select_own
  on public.cloud_saves
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy cloud_saves_insert_own
  on public.cloud_saves
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy cloud_saves_update_own
  on public.cloud_saves
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 没有 DELETE 策略，也没有授予 delete 权限：客户端不能通过 API 删除云端记录。

commit;
