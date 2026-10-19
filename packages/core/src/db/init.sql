create table if not exists workflows(
  id char(36) primary key,
  name varchar(255) not null,
  created_at timestamp default current_timestamp
);

create table if not exists workflow_instances(
  id char(36) primary key,
  workflow_id char(36) not null,
  status varchar(20) not null,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp on update current_timestamp,
  foreign key (workflow_id) references workflows(id)
);

create table if not exists workflow_steps(
  id char(36) primary key,
  workflow_id char(36) not null,
  step_name varchar(255) not null,
  step_order int not null,
  foreign key (workflow_id) references workflows(id)
);

create table if not exists step_executions(
  id char(36) primary key,
  workflow_instance_id char(36) not null,
  step_name varchar(255) not null,
  status varchar(20) not null,
  attempt int default 0,
  output JSON,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp on update current_timestamp,
  foreign key (workflow_instance_id) references workflow_instances(id),
  index idx_step_lookup (workflow_instance_id, step_name),

--   🧠 What happens after this

-- If two workers try:

-- (workflow_instance_id = X, step_name = step1, attempt = 1)

-- 👉 Only ONE insert will succeed
-- 👉 Other will throw:

-- ER_DUP_ENTRY
  UNIQUE KEY uniq_execution (workflow_instance_id, step_name, attempt)
);

-- It will make faster to query next step of a workflow in order
-- CREATE INDEX if not exists idx_steps_workflow_order
-- ON workflow_steps(workflow_id, step_order);

-- -- It will make faster to query last successful step of a workflow instance
-- CREATE INDEX if not exists idx_exec_instance_status_step
-- ON step_executions(workflow_instance_id, status, step_name);

-- -- It will make faster to query next attempt of a step execution for a workflow instance and also to mark success or failure of a step execution
-- CREATE INDEX if not exists idx_exec_attempt
-- ON step_executions(workflow_instance_id, step_name, attempt);

-- -- It will make faster to query running steps of a workflow instance
-- CREATE INDEX if not exists idx_exec_running
-- ON step_executions(
-- workflow_instance_id,
-- step_name,
-- status,
-- created_at
-- );

-- -- It will make faster to query resume workflow instances by status
-- CREATE INDEX if not exists idx_instances_status
-- ON workflow_instances(status);